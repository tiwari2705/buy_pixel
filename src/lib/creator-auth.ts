import crypto from 'node:crypto'

/**
 * Generates an unguessable, deterministic 6-digit PIN for a creator's promo code.
 * Uses HMAC-SHA256 with the secret ADMIN_SESSION_SECRET.
 * Without the server secret, nobody can predict or deduce another creator's PIN.
 */
export function getCreatorPin(code: string): string {
	const secret =
		process.env.ADMIN_SESSION_SECRET ||
		process.env.RAZORPAY_KEY_SECRET ||
		'sayitlpu-creator-portal-secret-key-salt'
	const hmac = crypto.createHmac('sha256', secret)
	hmac.update(`creator-pin:${code.trim().toUpperCase()}`)
	const hex = hmac.digest('hex')
	const num = parseInt(hex.slice(0, 8), 16)
	return (100000 + (num % 900000)).toString()
}

/**
 * Verifies if the candidate PIN matches the creator code's secret PIN.
 */
export function verifyCreatorPin(code: string, candidatePin?: string | null): boolean {
	if (!candidatePin) return false
	const expectedPin = getCreatorPin(code)
	return candidatePin.trim() === expectedPin
}
