import { NextResponse } from 'next/server'
import { getLiveBlocks, getWallStats } from '@/lib/blocks'

export const dynamic = 'force-dynamic'

/** GET /api/blocks -> all live blocks, revalidated quickly for fresh updates. */
export async function GET() {
	const [blocks, stats] = await Promise.all([getLiveBlocks(), getWallStats()])
	return NextResponse.json(
		{ blocks, stats },
		{
			headers: {
				// Cache for 10 seconds instead of 60 for faster updates
				'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
			},
		},
	)
}
