import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { releaseExpiredReservations } from '@/lib/blocks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Frees blocks whose reservation expired without a captured payment.
 * Called by the Vercel cron in vercel.json every 10 minutes, and available to
 * a signed-in admin. Authorise with CRON_SECRET via ?secret= or
 * Authorization: Bearer <CRON_SECRET>.
 */
async function handle(request: Request) {
	const secret = process.env.CRON_SECRET
	const url = new URL(request.url)
	const provided =
		url.searchParams.get('secret') ??
		request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
		''

	const authorised = (secret && provided === secret) || (await isAdminAuthenticated())
	if (!authorised) {
		return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
	}

	const released = await releaseExpiredReservations()
	return NextResponse.json({ ok: true, released })
}

export async function GET(request: Request) {
	return handle(request)
}

export async function POST(request: Request) {
	return handle(request)
}
