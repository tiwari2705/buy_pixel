import Link from 'next/link'
import { HomeWall } from '@/components/HomeWall'
import { getLiveBlocks } from '@/lib/blocks'
import { PRICING, formatInr } from '@/lib/config'

// No caching - always fetch fresh data
export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function HomePage() {
	const blocks = await getLiveBlocks()

	return (
		<>
			<section className="hero-section">
				<div className="hero-tag">
					<span className="stat-pill__dot" />
					LPU Student Pixel Wall &bull; 1,000,000 Pixels
				</div>
				<h1 className="hero-title">
					Own a Piece of <span className="hero-gradient">LPU History</span>
				</h1>
				<p className="hero-subtitle">
					Buy 10x10 pixel blocks for {formatInr(PRICING.pricePerBlockInr * 100)} each. Upload your photo, logo, or message and link it anywhere on the web.
				</p>
				<div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
					<Link href="/buy" className="button button--primary">
						Select Your Blocks &rarr;
					</Link>
					<Link href="/about" className="button">
						Learn How It Works
					</Link>
				</div>
			</section>

			<div className="wall-area">
				<HomeWall blocks={blocks} />
			</div>

			<section className="page-shell" style={{ paddingTop: 0 }}>
				<h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 32 }}>
					How It <span className="hero-gradient">Works</span>
				</h2>
				<div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
					<div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
						<div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
						<h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>1. Drag &amp; Select</h3>
						<p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
							Choose any open area on the 1000x1000 grid. Select 1 block or combine multiple blocks for a larger image.
						</p>
					</div>
					<div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
						<div style={{ fontSize: 32, marginBottom: 12 }}>🖼️</div>
						<h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>2. Upload &amp; Link</h3>
						<p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
							Upload your image, avatar, or graphic. Add your personal website, Instagram, LinkedIn, or project link.
						</p>
					</div>
					<div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
						<div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
						<h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>3. Instant Live</h3>
						<p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
							Complete payment via UPI or Cards. Your pixels publish to the wall instantly and stay live permanently.
						</p>
					</div>
				</div>
			</section>
		</>
	)
}
