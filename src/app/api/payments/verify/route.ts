import { NextResponse } from 'next/server'
import { verifyPaymentSignature } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/payments/verify
 * 
 * Verifies the Razorpay payment signature on the client side.
 * This is an OPTIONAL endpoint - the primary verification happens via webhook.
 * 
 * Expected payload from Razorpay checkout handler:
 * {
 *   razorpay_order_id: string
 *   razorpay_payment_id: string
 *   razorpay_signature: string
 * }
 * 
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export async function POST(request: Request) {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	const data = body as {
		razorpay_order_id?: string
		razorpay_payment_id?: string
		razorpay_signature?: string
	}

	const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data

	if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
		return NextResponse.json(
			{ 
				error: 'Missing required fields.',
				success: false,
			},
			{ status: 400 },
		)
	}

	const keySecret = process.env.RAZORPAY_KEY_SECRET
	if (!keySecret) {
		console.error('[verify-payment] RAZORPAY_KEY_SECRET is not configured')
		return NextResponse.json(
			{ error: 'Payment verification is not configured.' },
			{ status: 500 },
		)
	}

	try {
		const isValid = verifyPaymentSignature(
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
		)

		if (!isValid) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid payment signature.',
				},
				{ status: 400 },
			)
		}

		// Signature is valid
		// NOTE: The actual payment confirmation still happens via webhook
		// This endpoint only verifies that the signature is correct
		return NextResponse.json({
			success: true,
			message: 'Payment signature verified successfully.',
			orderId: razorpay_order_id,
			paymentId: razorpay_payment_id,
		})
	} catch (error) {
		console.error('[verify-payment] Signature verification failed:', error)
		return NextResponse.json(
			{ 
				success: false,
				error: 'Payment verification failed.',
			},
			{ status: 500 },
		)
	}
}
