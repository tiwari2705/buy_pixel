import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendRejectionEmail } from '@/lib/email'
import { refundPayment } from '@/lib/razorpay'
import { sanitizeText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Rejects a submission: refunds the payment in full, frees the cells so the
 * blocks return to the wall, and emails the buyer with the reason.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	if (!(await isAdminAuthenticated())) {
		return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
	}

	let body: { reason?: string }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	const reason = sanitizeText(body.reason ?? '', 300)
	if (reason.length < 5) {
		return NextResponse.json(
			{ error: 'Give a short reason - it is sent to the buyer.' },
			{ status: 400 },
		)
	}

	const block = await prisma.block.findUnique({
		where: { id },
		include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
	})
	if (!block) {
		return NextResponse.json({ error: 'Block not found.' }, { status: 404 })
	}
	if (block.status === 'rejected') {
		return NextResponse.json({ ok: true, alreadyRejected: true })
	}

	const payment = block.payments[0]
	let refundError: string | null = null

	if (payment?.razorpayPaymentId && payment.status === 'captured') {
		try {
			await refundPayment(payment.razorpayPaymentId, payment.amount, reason)
			await prisma.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } })
		} catch (error) {
			console.error('[reject] refund failed', error)
			refundError =
				'The block was rejected but the automatic refund failed. Issue it manually from the Razorpay dashboard.'
		}
	}

	// Free the cells so those blocks can be bought again.
	await prisma.$transaction([
		prisma.blockCell.deleteMany({ where: { blockId: block.id } }),
		prisma.block.update({
			where: { id: block.id },
			data: { status: 'rejected', rejectionReason: reason, approvedAt: null, reservedUntil: null },
		}),
	])

	await sendRejectionEmail({
		buyerName: block.buyerName ?? '',
		buyerEmail: block.buyerEmail ?? '',
		orderId: block.orderId ?? block.id,
		reason,
		amountPaise: payment?.amount ?? 0,
	})

	revalidatePath('/')
	revalidatePath('/admin')

	return NextResponse.json({ ok: true, warning: refundError })
}
