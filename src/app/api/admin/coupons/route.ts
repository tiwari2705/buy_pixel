import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminAuthenticated } from '@/lib/auth'
import { getCreatorPin } from '@/lib/creator-auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
	if (!(await isAdminAuthenticated())) {
		return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
	}

	const rawCoupons = await prisma.coupon.findMany({
		orderBy: { createdAt: 'desc' },
	})

	const coupons = rawCoupons.map((c) => ({
		...c,
		creatorPin: c.couponType === 'UNLIMITED' ? getCreatorPin(c.code) : undefined,
	}))

	return NextResponse.json({ coupons })
}

export async function POST(request: Request) {
	if (!(await isAdminAuthenticated())) {
		return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
	}

	let body: { code?: string; discountType?: string; discountValue?: number; couponType?: string }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	const code = (body.code ?? '').trim().toUpperCase()
	const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENT'
	const discountValue = Number(body.discountValue) || 0
	const couponType = body.couponType === 'UNLIMITED' ? 'UNLIMITED' : 'SINGLE_USE'

	if (!code || code.length < 2 || code.length > 30) {
		return NextResponse.json(
			{ error: 'Coupon code must be between 2 and 30 characters.' },
			{ status: 400 },
		)
	}

	if (discountValue <= 0) {
		return NextResponse.json(
			{ error: 'Discount value must be greater than 0.' },
			{ status: 400 },
		)
	}

	if (discountType === 'PERCENT' && discountValue > 100) {
		return NextResponse.json(
			{ error: 'Percentage discount cannot exceed 100%.' },
			{ status: 400 },
		)
	}

	const existing = await prisma.coupon.findUnique({
		where: { code },
	})

	if (existing) {
		return NextResponse.json(
			{ error: `Coupon code '${code}' already exists.` },
			{ status: 400 },
		)
	}

	const coupon = await prisma.coupon.create({
		data: {
			code,
			discountType,
			discountValue,
			couponType: couponType as 'SINGLE_USE' | 'UNLIMITED',
		},
	})

	revalidatePath('/admin')
	return NextResponse.json({
		coupon: {
			...coupon,
			creatorPin: couponType === 'UNLIMITED' ? getCreatorPin(code) : undefined,
		},
	})
}

export async function DELETE(request: Request) {
	if (!(await isAdminAuthenticated())) {
		return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const id = searchParams.get('id')

	if (!id) {
		return NextResponse.json({ error: 'Coupon ID is required.' }, { status: 400 })
	}

	try {
		await prisma.coupon.delete({
			where: { id },
		})
		revalidatePath('/admin')
		return NextResponse.json({ ok: true })
	} catch {
		return NextResponse.json({ error: 'Could not delete coupon.' }, { status: 400 })
	}
}

