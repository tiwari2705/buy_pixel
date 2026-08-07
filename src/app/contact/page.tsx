import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'
import { SITE } from '@/lib/config'

export const metadata: Metadata = {
	title: 'Contact Us',
	description: `Get in touch with ${SITE.name} regarding questions, payments, or takedowns.`,
}

export default function ContactPage() {
	return (
		<div className="page-shell">
			<div style={{ marginBottom: 36 }}>
				<h1 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 8px' }}>
					Contact <span className="hero-gradient">Us</span>
				</h1>
				<p className="lede" style={{ margin: 0 }}>
					Questions about buying a block, payments, refunds, or takedowns? Reach out below and we&apos;ll reply within one business day.
				</p>
			</div>

			<div className="buy-layout">
				<div>
					<h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 16, color: 'var(--text-primary)' }}>
						Send Us a Message
					</h2>
					<ContactForm />
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
					<h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 16, color: 'var(--text-primary)' }}>
						Direct Channels
					</h2>

					<div className="panel">
						<h3 className="panel__title" style={{ fontSize: 16, color: 'var(--accent)' }}>
							📧 Direct Email
						</h3>
						<p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
							<a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
						</p>
						<p className="hint" style={{ margin: 0, color: 'var(--text-muted)' }}>
							Best for payment inquiries, receipts, and moderation questions.
						</p>
					</div>

					<div className="panel">
						<h3 className="panel__title" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
							🛡️ Reporting a Block
						</h3>
						<p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
							If a block on the wall infringes copyright, impersonates a person, or breaks our rules, email us with the block position (e.g. &quot;column 24, row 11&quot;) and a short explanation. Infringing content will be removed promptly.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
