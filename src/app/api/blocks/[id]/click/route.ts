import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { clientIp } from '@/lib/rate-limit'
import { hashIp, sanitizeText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Optional click analytics. IPs are hashed, never stored raw. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	try {
		const block = await prisma.block.findUnique({
			where: { id },
			select: { id: true, status: true },
		})
		if (!block || block.status !== 'live') {
			return NextResponse.json({ ok: true })
		}

		await prisma.click.create({
			data: {
				blockId: block.id,
				ipHash: hashIp(clientIp(request.headers)),
				referrer: sanitizeText(request.headers.get('referer') ?? '', 300) || null,
			},
		})
	} catch (error) {
		console.error('[click] failed', error)
	}

	return NextResponse.json({ ok: true })
}
