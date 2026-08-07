import { NextResponse } from 'next/server'
import { getLiveBlocks, getWallStats } from '@/lib/blocks'

export const dynamic = 'force-dynamic'

/** GET /api/blocks -> all live blocks, cached at the edge for the wall. */
export async function GET() {
	const [blocks, stats] = await Promise.all([getLiveBlocks(), getWallStats()])
	return NextResponse.json(
		{ blocks, stats },
		{
			headers: {
				'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
			},
		},
	)
}
