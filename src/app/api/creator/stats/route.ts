import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { verifyCreatorPin } from '@/lib/creator-auth'
import { prisma } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { RATE_LIMITS } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CREATOR_COMMISSION_PERCENT = 25

/**
 * GET /api/creator/stats?code=CODE&pin=PIN
 * 
 * Fetches real-time statistics for a creator's promo code:
 * - Requires the creator's secret 6-digit PIN (or admin authentication)
 * - Calculates 25% creator revenue share from captured orders
 * - Returns 401 if PIN is missing or invalid, keeping all revenue private.
 */
export async function GET(request: Request) {
	const limit = rateLimit(`creator_stats:${clientIp(request.headers)}`, RATE_LIMITS.orders ?? 15)
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many requests. Please wait a moment and try again.' },
			{ status: 429 },
		)
	}

	const { searchParams } = new URL(request.url)
	const rawCode = searchParams.get('code')
	const pin = searchParams.get('pin')
	const code = (rawCode ?? '').trim().toUpperCase()

	if (!code) {
		return NextResponse.json({ error: 'Please provide a promo code.' }, { status: 400 })
	}

	const coupon = await prisma.coupon.findUnique({
		where: { code },
		include: {
			redemptions: {
				orderBy: { createdAt: 'desc' },
				take: 50,
			},
		},
	})

	if (!coupon) {
		return NextResponse.json(
			{ error: `No creator code found matching '${code}'. Check spelling and try again.` },
			{ status: 404 },
		)
	}

	// Privacy protection: Require secret creator PIN unless logged in as admin
	const isAdmin = await isAdminAuthenticated()
	if (!isAdmin && !verifyCreatorPin(code, pin)) {
		return NextResponse.json(
			{
				error: pin
					? 'Invalid private Access PIN for this creator code.'
					: 'Private Access PIN is required to view this creator dashboard.',
				requiresPin: true,
				code: coupon.code,
			},
			{ status: 401 },
		)
	}

	const blockIds = coupon.redemptions
		.map((r) => r.blockId)
		.filter((id): id is string => typeof id === 'string' && id.length > 0)

	// Fetch payments and block geometries for these redemptions
	const [payments, blocks] = await Promise.all([
		prisma.payment.findMany({
			where: {
				blockId: { in: blockIds },
				status: 'captured',
			},
			select: {
				blockId: true,
				amount: true,
				createdAt: true,
			},
		}),
		prisma.block.findMany({
			where: {
				id: { in: blockIds },
			},
			select: {
				id: true,
				width: true,
				height: true,
				createdAt: true,
				approvedAt: true,
			},
		}),
	])

	const paymentByBlock = new Map(payments.map((p) => [p.blockId, p]))
	const blockById = new Map(blocks.map((b) => [b.id, b]))

	let totalRevenuePaise = 0
	let totalBlocksSold = 0

	const orders = coupon.redemptions.map((redemption) => {
		const block = redemption.blockId ? blockById.get(redemption.blockId) : undefined
		const payment = redemption.blockId ? paymentByBlock.get(redemption.blockId) : undefined

		const amountPaise = payment?.amount ?? 0
		const blocksCount = block ? block.width * block.height : 0
		const commissionPaise = Math.round(amountPaise * (CREATOR_COMMISSION_PERCENT / 100))

		totalRevenuePaise += amountPaise
		totalBlocksSold += blocksCount

		return {
			id: redemption.id,
			date: (payment?.createdAt ?? redemption.createdAt).toISOString(),
			blockArea: block ? `${block.width} × ${block.height} blocks` : 'Standard area',
			blocksCount,
			amountPaise,
			commissionPaise,
			isFree: amountPaise === 0,
		}
	})

	const creatorCommissionPaise = Math.round(
		totalRevenuePaise * (CREATOR_COMMISSION_PERCENT / 100),
	)

	return NextResponse.json({
		code: coupon.code,
		discountType: coupon.discountType,
		discountValue: coupon.discountValue,
		couponType: coupon.couponType,
		commissionPercent: CREATOR_COMMISSION_PERCENT,
		totalRedemptions: Math.max(coupon.usageCount, coupon.redemptions.length),
		totalRevenuePaise,
		creatorCommissionPaise,
		totalBlocksSold,
		orders,
	})
}
