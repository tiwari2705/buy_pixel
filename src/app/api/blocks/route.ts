import { NextResponse } from 'next/server'
import { getLiveBlocks, getWallStats } from '@/lib/blocks'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET /api/blocks -> all live blocks, always fresh (no caching). */
export async function GET() {
	const [blocks, stats] = await Promise.all([getLiveBlocks(), getWallStats()])
	return NextResponse.json(
		{ blocks, stats },
		{
			headers: {
				// No caching - always return fresh data
				'Cache-Control': 'no-store, no-cache, must-revalidate',
			},
		},
	)
}
