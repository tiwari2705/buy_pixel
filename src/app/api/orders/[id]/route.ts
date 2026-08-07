import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/:id  (id = Razorpay order id, or the internal block id)
 * Used by the confirmation screen to poll until the webhook has landed.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const payment = await prisma.payment.findFirst({
		where: {
			OR: [{ razorpayOrderId: id }, { blockId: id }],
		},
		include: { block: true },
		orderBy: { createdAt: 'desc' },
	})

	if (!payment || !payment.block) {
		return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
	}

	return NextResponse.json(
		{
			orderId: payment.razorpayOrderId,
			paymentId: payment.razorpayPaymentId,
			paymentStatus: payment.status,
			// `status` reflects the block lifecycle; the confirmation screen polls this.
			status: payment.block.status,
			blockStatus: payment.block.status,
			amount: payment.amount,
			currency: payment.currency,
			blocks: payment.block.width * payment.block.height,
			selection: {
				x: payment.block.x,
				y: payment.block.y,
				width: payment.block.width,
				height: payment.block.height,
			},
		},
		{ headers: { 'Cache-Control': 'no-store' } },
	)
}
