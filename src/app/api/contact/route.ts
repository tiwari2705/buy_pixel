import { NextResponse } from 'next/server'
import { RATE_LIMITS } from '@/lib/config'
import { prisma } from '@/lib/db'
import { sendContactNotification } from '@/lib/email'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { hashIp, sanitizeText } from '@/lib/sanitize'
import { contactSchema, flattenZodError } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
	const ip = clientIp(request.headers)
	const limit = rateLimit(`contact:${ip}`, RATE_LIMITS.contact)
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many messages. Please try again later.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	const parsed = contactSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Please fix the highlighted fields.', fields: flattenZodError(parsed.error) },
			{ status: 400 },
		)
	}

	const message = {
		name: sanitizeText(parsed.data.name, 80),
		email: parsed.data.email.trim().toLowerCase(),
		subject: sanitizeText(parsed.data.subject, 120),
		message: sanitizeText(parsed.data.message, 2000),
	}

	try {
		await prisma.contactMessage.create({ data: { ...message, ipHash: hashIp(ip) } })
		await sendContactNotification(message)
	} catch (error) {
		console.error('[contact] failed', error)
		return NextResponse.json(
			{ error: 'Could not send your message. Please email us directly.' },
			{ status: 500 },
		)
	}

	return NextResponse.json({ ok: true })
}
