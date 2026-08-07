import type { Metadata } from 'next'
import { BuyFlow } from '@/components/BuyFlow'
import { PRICING, formatInr, pricePerBlockPaise } from '@/lib/config'

export const metadata: Metadata = {
	title: 'Buy Pixels',
	description: `Pick your blocks on the wall, upload your photo and pay Rs ${PRICING.pricePerBlockInr} per block.`,
}

export const dynamic = 'force-dynamic'

export default function BuyPage() {
	return (
		<div className="page-shell">
			<div style={{ marginBottom: 32 }}>
				<h1 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 8px' }}>
					Buy Your <span className="hero-gradient">Pixels</span>
				</h1>
				<p className="lede" style={{ margin: 0 }}>
					Drag a rectangle on the canvas below, upload your graphic or photo, and pay {formatInr(pricePerBlockPaise)} per 10x10 block.
				</p>
			</div>
			<BuyFlow />
		</div>
	)
}
