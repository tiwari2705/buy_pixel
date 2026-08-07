import { NextResponse } from 'next/server'
import {
	ADMIN_COOKIE,
	checkAdminCredentials,
	createSessionToken,
	sessionCookieOptions,
} from '@/lib/auth'
import { RATE_LIMITS } from '@/lib/config'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
	const limit = rateLimit(`admin-login:${clientIp(request.headers)}`, RATE_LIMITS.adminLogin)
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many attempts. Try again later.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
		)
	}

	let body: { email?: string; password?: string }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	if (!body.email || !body.password || !checkAdminCredentials(body.email, body.password)) {
		return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
	}

	const response = NextResponse.json({ ok: true })
	response.cookies.set(ADMIN_COOKIE, createSessionToken(body.email), sessionCookieOptions)
	return response
}

/** Sign out. */
export async function DELETE() {
	const response = NextResponse.json({ ok: true })
	response.cookies.set(ADMIN_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
	return response
}
