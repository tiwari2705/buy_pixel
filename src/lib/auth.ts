import crypto from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'sayitlpu_admin'
const SESSION_TTL_MS = 1000 * 60 * 60 * 8 // 8 hours

function secret(): string {
	const value = process.env.ADMIN_SESSION_SECRET
	if (!value || value.length < 16) {
		throw new Error('ADMIN_SESSION_SECRET must be set to a long random string')
	}
	return value
}

function sign(payload: string): string {
	return crypto.createHmac('sha256', secret()).update(payload).digest('hex')
}

function safeEquals(a: string, b: string): boolean {
	const bufA = Buffer.from(a)
	const bufB = Buffer.from(b)
	if (bufA.length !== bufB.length) return false
	return crypto.timingSafeEqual(bufA, bufB)
}

export function checkAdminCredentials(email: string, password: string): boolean {
	const expectedEmail = process.env.ADMIN_EMAIL ?? ''
	const expectedPassword = process.env.ADMIN_PASSWORD ?? ''
	if (!expectedEmail || !expectedPassword) return false
	return (
		safeEquals(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase()) &&
		safeEquals(password, expectedPassword)
	)
}

export function createSessionToken(email: string): string {
	const expiresAt = Date.now() + SESSION_TTL_MS
	const payload = `${email.toLowerCase()}.${expiresAt}`
	return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): boolean {
	if (!token) return false
	const [encoded, signature] = token.split('.')
	if (!encoded || !signature) return false
	let payload: string
	try {
		payload = Buffer.from(encoded, 'base64url').toString('utf8')
	} catch {
		return false
	}
	if (!safeEquals(sign(payload), signature)) return false
	const expiresAt = Number(payload.split('.').pop())
	return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

/** Server-component / route-handler helper. */
export async function isAdminAuthenticated(): Promise<boolean> {
	try {
		const cookieStore = await cookies()
		return verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value)
	} catch {
		return false
	}
}

export const sessionCookieOptions = {
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	path: '/',
	maxAge: SESSION_TTL_MS / 1000,
}
