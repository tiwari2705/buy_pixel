import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { BlocksTakenError, blockCount, isInsideGrid, reserveBlocks, completeFreeOrder } from '@/lib/blocks'
import {
	GRID,
	PRICING,
	RATE_LIMITS,
	RESERVATION_MINUTES,
	SITE,
	amountForBlocksPaise,
} from '@/lib/config'
import { prisma } from '@/lib/db'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { createRazorpayOrder } from '@/lib/razorpay'
import { sanitizeText } from '@/lib/sanitize'
import { createOrderSchema, flattenZodError, meetsMinimumDimensions } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Validate -> reserve -> create Razorpay order (or complete free order).
 *
 * The base amount is computed from block count and any valid coupon is applied here.
 */
export async function POST(request: Request) {
	const limit = rateLimit(`orders:${clientIp(request.headers)}`, RATE_LIMITS.orders)
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many attempts. Please wait a few minutes and try again.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	const parsed = createOrderSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Please fix the highlighted fields.', fields: flattenZodError(parsed.error) },
			{ status: 400 },
		)
	}

	const { selection, buyer } = parsed.data
	const rawCoupon = typeof body === 'object' && body !== null ? (body as { couponCode?: string }).couponCode : undefined
	const couponCode = rawCoupon ? rawCoupon.trim().toUpperCase() : undefined

	if (!isInsideGrid(selection)) {
		return NextResponse.json({ error: 'That selection is outside the wall.' }, { status: 400 })
	}

	if (!meetsMinimumDimensions({ width: buyer.imageWidth, height: buyer.imageHeight }, selection)) {
		return NextResponse.json(
			{
				error: `Your image must be at least ${selection.width * GRID.blockPixelSize} x ${selection.height * GRID.blockPixelSize}px for this selection.`,
				fields: { image: 'Upload a larger image.' },
			},
			{ status: 400 },
		)
	}

	const blocks = blockCount(selection)
	const baseAmountPaise = amountForBlocksPaise(blocks)
	let finalAmountPaise = baseAmountPaise
	let appliedCouponCode: string | undefined

	if (couponCode) {
		const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })
		if (!coupon || coupon.isUsed) {
			return NextResponse.json(
				{ error: 'Coupon code is invalid or has already been used.' },
				{ status: 400 },
			)
		}
		let discountPaise = 0
		if (coupon.discountType === 'PERCENT') {
			discountPaise = Math.round(baseAmountPaise * (coupon.discountValue / 100))
		} else if (coupon.discountType === 'FIXED') {
			discountPaise = Math.round(coupon.discountValue * 100)
		}
		discountPaise = Math.min(baseAmountPaise, Math.max(0, discountPaise))
		finalAmountPaise = Math.max(0, baseAmountPaise - discountPaise)
		appliedCouponCode = coupon.code
	}

	// Clean every string before it is stored, so nothing HTML-ish is ever saved.
	const cleanName = sanitizeText(buyer.name, 60)
	const cleanDescription = sanitizeText(buyer.description, 150)
	const cleanEmail = buyer.email.trim().toLowerCase()

	if (cleanName.length < 2) {
		return NextResponse.json(
			{ error: 'Please fix the highlighted fields.', fields: { name: 'Enter your real name.' } },
			{ status: 400 },
		)
	}

	let reservation: { blockId: string }
	try {
		reservation = await reserveBlocks({
			selection,
		})
	} catch (error) {
		if (error instanceof BlocksTakenError) {
			return NextResponse.json({ error: error.message, code: 'BLOCKS_TAKEN' }, { status: 409 })
		}
		console.error('[orders] reservation failed', error)
		return NextResponse.json({ error: 'Could not reserve those blocks.' }, { status: 500 })
	}

	// Buyer details are NOT stored in the Block yet. They are held in
	// Payment.buyerData and only written to the Block when the Razorpay
	// webhook confirms payment (payment.captured).
	const buyerData = {
		buyerName: cleanName,
		buyerEmail: cleanEmail,
		linkUrl: buyer.linkUrl.trim(),
		description: cleanDescription,
		imageUrl: buyer.imageUrl,
		imageWidth: buyer.imageWidth,
		imageHeight: buyer.imageHeight,
		couponCode: appliedCouponCode,
	}

	// Handle 100% discount / free orders directly without Razorpay
	if (finalAmountPaise === 0 && appliedCouponCode) {
		try {
			await completeFreeOrder({
				blockId: reservation.blockId,
				buyerData,
				couponCode: appliedCouponCode,
			})

			// Revalidate homepage to show the new block
			revalidatePath('/')
			revalidatePath('/admin')

			return NextResponse.json({
				isFreeOrder: true,
				blockId: reservation.blockId,
				amountPaise: 0,
				blocks,
				selection,
				siteName: SITE.name,
				buyer: { name: cleanName, email: cleanEmail },
			})
		} catch (error) {
			console.error('[orders] free order completion failed', error)
			await prisma.$transaction([
				prisma.blockCell.deleteMany({ where: { blockId: reservation.blockId } }),
				prisma.block.deleteMany({ where: { id: reservation.blockId } }),
			])
			return NextResponse.json(
				{ error: 'Could not complete the free order. Please try again.' },
				{ status: 500 },
			)
		}
	}

	const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)

	try {
		const razorpayOrder = await createRazorpayOrder({
			amountPaise: finalAmountPaise,
			currency: PRICING.currency,
			receipt: `blk_${reservation.blockId.slice(0, 30)}`,
			notes: {
				blockId: reservation.blockId,
				area: `${selection.width}x${selection.height} at (${selection.x},${selection.y})`,
				blocks: String(blocks),
				couponCode: appliedCouponCode ?? '',
			},
		})

		await prisma.$transaction([
			prisma.payment.create({
				data: {
					blockId: reservation.blockId,
					razorpayOrderId: razorpayOrder.id,
					amount: finalAmountPaise,
					currency: PRICING.currency,
					status: 'created',
					buyerData, // Held here until webhook confirms payment
				},
			}),
			prisma.block.update({
				where: { id: reservation.blockId },
				data: { orderId: razorpayOrder.id },
			}),
		])

		return NextResponse.json({
			blockId: reservation.blockId,
			razorpayOrderId: razorpayOrder.id,
			razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
			amountPaise: finalAmountPaise,
			currency: PRICING.currency,
			blocks,
			selection,
			reservedUntil: reservedUntil.toISOString(),
			reservationMinutes: RESERVATION_MINUTES,
			siteName: SITE.name,
			buyer: { name: cleanName, email: cleanEmail },
		})
	} catch (error: any) {
		// Roll the reservation back so the blocks are not stuck.
		const reason = error?.message || 'Could not start the payment'
		console.error('[orders] razorpay order failed:', reason, error)
		await prisma.$transaction([
			prisma.blockCell.deleteMany({ where: { blockId: reservation.blockId } }),
			prisma.block.deleteMany({ where: { id: reservation.blockId } }),
		])
		return NextResponse.json(
			{ error: `Payment creation failed: ${reason}` },
			{ status: 502 },
		)
	}
}
