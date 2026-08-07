import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { RATE_LIMITS } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
	const limit = rateLimit(`coupon_val:${clientIp(request.headers)}`, RATE_LIMITS.orders ?? 10)
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many requests. Please try again later.' },
			{ status: 429 },
		)
	}

	let body: { code?: string; amountPaise?: number }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
	}

	const code = (body.code ?? '').trim().toUpperCase()
	const originalAmountPaise = Number(body.amountPaise) || 0

	if (!code) {
		return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 })
	}

	const coupon = await prisma.coupon.findUnique({
		where: { code },
	})

	if (!coupon) {
		return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 404 })
	}

	if (coupon.isUsed) {
		return NextResponse.json({ error: 'This coupon has already been used.' }, { status: 400 })
	}

	let discountPaise = 0
	if (coupon.discountType === 'PERCENT') {
		discountPaise = Math.round(originalAmountPaise * (coupon.discountValue / 100))
	} else if (coupon.discountType === 'FIXED') {
		discountPaise = Math.round(coupon.discountValue * 100) // discountValue is in Rupees
	}

	discountPaise = Math.min(originalAmountPaise, Math.max(0, discountPaise))
	const finalAmountPaise = Math.max(0, originalAmountPaise - discountPaise)

	return NextResponse.json({
		valid: true,
		code: coupon.code,
		discountType: coupon.discountType,
		discountValue: coupon.discountValue,
		discountPaise,
		finalAmountPaise,
		isFree: finalAmountPaise === 0,
	})
}
