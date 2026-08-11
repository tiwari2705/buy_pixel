import crypto from 'node:crypto'
import Razorpay from 'razorpay'

function required(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var ${name}`)
	return value
}

let client: Razorpay | null = null

/**
 * Reset the Razorpay client instance.
 * Useful when credentials change during development.
 */
export function resetRazorpayClient(): void {
	client = null
	console.log('[razorpay] Client reset - will reinitialize on next use')
}

export function razorpay(): Razorpay {
	if (!client) {
		const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim()
		const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
		
		// Debug logging
		console.log('[razorpay] Initializing with Key ID:', keyId ? `${keyId.slice(0, 15)}...` : 'MISSING')
		console.log('[razorpay] Key Secret present:', keySecret ? 'YES' : 'NO')
		
		if (!keyId) throw new Error('Missing required env var RAZORPAY_KEY_ID or NEXT_PUBLIC_RAZORPAY_KEY_ID')
		if (!keySecret) throw new Error('Missing required env var RAZORPAY_KEY_SECRET')

		client = new Razorpay({
			key_id: keyId,
			key_secret: keySecret,
		})
		
		console.log('[razorpay] Client initialized successfully')
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
	console.log('[razorpay] Creating order with params:', {
		amountPaise: params.amountPaise,
		currency: params.currency,
		receipt: params.receipt,
	})
	
	try {
		const order = await razorpay().orders.create({
			amount: params.amountPaise, // always computed server-side
			currency: params.currency,
			receipt: params.receipt,
			notes: params.notes,
		})
		
		console.log('[razorpay] Order created successfully:', order.id)
		
		return {
			id: order.id as string,
			amount: Number(order.amount),
			currency: order.currency as string,
			status: order.status as string,
		}
	} catch (error: any) {
		console.error('[razorpay] orders.create FULL ERROR:', JSON.stringify(error, null, 2))
		console.error('[razorpay] Error statusCode:', error?.statusCode)
		console.error('[razorpay] Error code:', error?.error?.code)
		console.error('[razorpay] Error description:', error?.error?.description)
		
		const msg = error?.error?.description || error?.message || String(error)
		console.error('[razorpay] orders.create failed:', msg, error)
		throw new Error(msg)
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

/**
 * Verifies a Razorpay payment signature from the client-side callback.
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * 
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature received from Razorpay
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaymentSignature(
	orderId: string,
	paymentId: string,
	signature: string,
): boolean {
	if (!orderId || !paymentId || !signature) return false
	
	try {
		const keySecret = process.env.RAZORPAY_KEY_SECRET
		if (!keySecret) {
			console.error('[razorpay] RAZORPAY_KEY_SECRET is not configured')
			return false
		}

		const generatedSignature = crypto
			.createHmac('sha256', keySecret)
			.update(`${orderId}|${paymentId}`)
			.digest('hex')

		const signatureBuffer = Buffer.from(signature, 'utf8')
		const generatedBuffer = Buffer.from(generatedSignature, 'utf8')

		if (signatureBuffer.length !== generatedBuffer.length) return false
		return crypto.timingSafeEqual(signatureBuffer, generatedBuffer)
	} catch (error) {
		console.error('[razorpay] Payment signature verification failed:', error)
		return false
	}
}

export async function refundPayment(paymentId: string, amountPaise: number, reason: string) {
	return razorpay().payments.refund(paymentId, {
		amount: amountPaise,
		speed: 'normal',
		notes: { reason: reason.slice(0, 250) },
	})
}
