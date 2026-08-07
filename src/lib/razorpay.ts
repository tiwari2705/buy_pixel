import crypto from 'node:crypto'
import Razorpay from 'razorpay'

function required(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var ${name}`)
	return value
}

let client: Razorpay | null = null

export function razorpay(): Razorpay {
	if (!client) {
		client = new Razorpay({
			key_id: required('RAZORPAY_KEY_ID'),
			key_secret: required('RAZORPAY_KEY_SECRET'),
		})
	}
	return client
}

export type RazorpayOrder = {
	id: string
	amount: number
	currency: string
	status: string
}

export async function createRazorpayOrder(params: {
	amountPaise: number
	currency: string
	receipt: string
	notes: Record<string, string>
}): Promise<RazorpayOrder> {
	const order = await razorpay().orders.create({
		amount: params.amountPaise, // always computed server-side
		currency: params.currency,
		receipt: params.receipt,
		payment_capture: true,
		notes: params.notes,
	})
	return {
		id: order.id as string,
		amount: Number(order.amount),
		currency: order.currency as string,
		status: order.status as string,
	}
}

/**
 * Verifies a Razorpay webhook signature using HMAC SHA-256 over the RAW body.
 * Never parse the body before verifying.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
	if (!signature) return false
	const expected = crypto
		.createHmac('sha256', required('RAZORPAY_WEBHOOK_SECRET'))
		.update(rawBody)
		.digest('hex')
	const a = Buffer.from(expected, 'utf8')
	const b = Buffer.from(signature, 'utf8')
	if (a.length !== b.length) return false
	return crypto.timingSafeEqual(a, b)
}

export async function refundPayment(paymentId: string, amountPaise: number, reason: string) {
	return razorpay().payments.refund(paymentId, {
		amount: amountPaise,
		speed: 'normal',
		notes: { reason: reason.slice(0, 250) },
	})
}
