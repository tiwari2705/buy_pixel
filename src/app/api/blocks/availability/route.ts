import { NextResponse } from 'next/server'
import { GRID, PRICING, TOTAL_BLOCKS, pricePerBlockPaise } from '@/lib/config'
import { getLiveBlocks, getOccupiedCells, getWallStats } from '@/lib/blocks'

export const dynamic = 'force-dynamic'

/**
 * GET /api/blocks/availability
 * Occupied cell map for the buy page. Cells are encoded as y * columns + x to
 * keep the payload small (10,000 cells max). Also returns the live blocks (so
 * the buy grid can render taken art), wall stats, and pricing.
 */
export async function GET() {
	const [cells, blocks, stats] = await Promise.all([
		getOccupiedCells(),
		getLiveBlocks(),
		getWallStats(),
	])
	const occupied = cells.map((cell) => cell.y * GRID.columns + cell.x)

	return NextResponse.json(
		{
			columns: GRID.columns,
			rows: GRID.rows,
			totalBlocks: TOTAL_BLOCKS,
			occupied,
			blocks,
			stats: { sold: stats.sold, remaining: stats.remaining, total: stats.totalBlocks },
			pricing: {
				pricePerBlockInr: PRICING.pricePerBlockInr,
				pricePerBlockPaise,
				currency: PRICING.currency,
			},
		},
		{ headers: { 'Cache-Control': 'no-store' } },
	)
}
