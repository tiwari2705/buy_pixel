import type { Metadata } from 'next'
import Link from 'next/link'
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID, PRICING, SITE, TOTAL_BLOCKS, formatInr, pricePerBlockPaise } from '@/lib/config'

export const metadata: Metadata = {
	title: 'About Us',
	description: `What ${SITE.name} is, who it is for, and who runs it.`,
}

export default function AboutPage() {
	return (
		<div className="page-shell">
			<div style={{ marginBottom: 32 }}>
				<h1 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 8px' }}>
					About <span className="hero-gradient">{SITE.name}</span>
				</h1>
				<p className="lede" style={{ margin: 0 }}>
					{SITE.name} is a {CANVAS_WIDTH}x{CANVAS_HEIGHT} pixel canvas containing {TOTAL_BLOCKS.toLocaleString('en-IN')} blocks. Anyone can buy a block for {formatInr(pricePerBlockPaise)}, showcase their image, and link it anywhere on the internet.
				</p>
			</div>

			<div className="prose">
				<div className="callout">
					<strong>Not affiliated with the university.</strong> {SITE.disclaimer} We are students building a creative digital wall for the student community.
				</div>

				<h2>Why We Built It</h2>
				<p>
					In 2005, a student named Alex Tew created the Million Dollar Homepage to pay for university. The page became legendary because it was a permanent, vibrant snapshot of the internet at that time.
				</p>
				<p>
					We wanted to bring that exact experience to our campus. Students run photography pages, clubs, resale groups, tech startups, music channels, and creative side hustles. A pixel block on this wall doesn&apos;t scroll away in a chat group—it stays right in place permanently.
				</p>

				<h2>Specifications &amp; Numbers</h2>
				<div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', margin: '24px 0 32px' }}>
					<div className="panel" style={{ textAlign: 'center', padding: '24px 16px' }}>
						<div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>CANVAS DIMENSIONS</div>
						<div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{CANVAS_WIDTH} × {CANVAS_HEIGHT}px</div>
					</div>
					<div className="panel" style={{ textAlign: 'center', padding: '24px 16px' }}>
						<div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>BLOCK SIZE</div>
						<div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{GRID.blockPixelSize} × {GRID.blockPixelSize}px</div>
					</div>
					<div className="panel" style={{ textAlign: 'center', padding: '24px 16px' }}>
						<div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL CAPACITY</div>
						<div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{TOTAL_BLOCKS.toLocaleString('en-IN')} Blocks</div>
					</div>
					<div className="panel" style={{ textAlign: 'center', padding: '24px 16px' }}>
						<div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>PRICE PER BLOCK</div>
						<div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>{formatInr(pricePerBlockPaise)}</div>
					</div>
				</div>

				<h2>Content Guidelines</h2>
				<p>
					We monitor the wall and will remove adult content, hate speech, harassment, illegal activity, malware/phishing links, or unauthorized corporate branding. Removed submissions are refunded in full. Read the complete guidelines in our <Link href="/terms">Terms &amp; Conditions</Link>.
				</p>

				<h2>Who Runs This</h2>
				<p>
					{SITE.name} is operated by {SITE.legalEntity}. It is a self-funded student initiative. If you have any questions or feedback, reach out on our <Link href="/contact">Contact Page</Link> or email us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
				</p>
			</div>
		</div>
	)
}
