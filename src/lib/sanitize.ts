import crypto from 'node:crypto'

/**
 * Strip anything that could act as markup. React already escapes text nodes,
 * but we sanitize on the way IN as well so stored data is always clean and safe
 * for canvas tooltips, emails, and any future non-React rendering surface.
 */
export function sanitizeText(input: string, maxLength: number): string {
	return input
		.replace(/<[^>]*>/g, '')
		.replace(/[<>]/g, '')
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength)
}

/** Escapes a string for safe interpolation into HTML emails. */
export function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

export function hashIp(ip: string): string {
	const salt = process.env.ADMIN_SESSION_SECRET ?? 'sayitlpu-salt'
	return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}
