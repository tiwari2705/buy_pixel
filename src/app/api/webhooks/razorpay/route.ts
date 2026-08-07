import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { markOrderPaid, markPaymentFailed } from '@/lib/blocks'
import { prisma } from '@/lib/db'
import { sendReceiptEmail } from '@/lib/email'
import { verifyWebhookSignature } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * The only place a payment is ever confirmed.
 *
 * 1. Read the RAW body and verify the HMAC SHA-256 signature.
 * 2. Deduplicate on the Razorpay event id, so repeated deliveries are no-ops.
 * 3. On payment.captured, move the block to pending_review and email a receipt.
 *
 * A client-side callback never marks anything paid.
 */
export async function POST(request: Request) {
	const rawBody = await request.text()
	const signature = request.headers.get('x-razorpay-signature')

	if (!verifyWebhookSignature(rawBody, signature)) {
		return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
	}

	let event: {
		event?: string
		payload?: {
			payment?: {
				entity?: { id?: string; order_id?: string; amount?: number; currency?: string }
			}
		}
	}
	try {
		event = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
	}

	const eventId = request.headers.get('x-razorpay-event-id')
	const eventType = event.event ?? 'unknown'

	// Idempotency: remember every event id we have already handled.
	if (eventId) {
		try {
			await prisma.webhookEvent.create({ data: { eventId, eventType } })
		} catch {
			// Duplicate delivery - already handled, acknowledge and stop.
			return NextResponse.json({ ok: true, duplicate: true })
		}
	}

	const entity = event.payload?.payment?.entity
	const razorpayOrderId = entity?.order_id

	if (!razorpayOrderId) {
		return NextResponse.json({ ok: true, ignored: true })
	}

	try {
		if (eventType === 'payment.captured') {
			const result = await markOrderPaid({
				razorpayOrderId,
				razorpayPaymentId: entity?.id ?? '',
				amountPaise: Number(entity?.amount ?? 0),
				currency: entity?.currency ?? 'INR',
				rawPayload: event,
			})

			if (result.blockId && !result.alreadyProcessed) {
				// Block now has buyer data (written by markOrderPaid above).
				const block = await prisma.block.findUnique({ where: { id: result.blockId } })
				if (block && block.buyerName && block.buyerEmail) {
					await sendReceiptEmail({
						buyerName: block.buyerName,
						buyerEmail: block.buyerEmail,
						orderId: razorpayOrderId,
						paymentId: entity?.id ?? '',
						blockCount: block.width * block.height,
						amountPaise: Number(entity?.amount ?? 0),
						selection: {
							x: block.x,
							y: block.y,
							width: block.width,
							height: block.height,
						},
					})
				}
				revalidatePath('/')
				revalidatePath('/admin')
			}
		} else if (eventType === 'payment.failed') {
			await markPaymentFailed({ razorpayOrderId, rawPayload: event })
		}
	} catch (error) {
		console.error('[razorpay webhook] handling failed', error)
		// 500 makes Razorpay retry, which is what we want.
		return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
	}

	return NextResponse.json({ ok: true })
}
