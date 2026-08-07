import Link from 'next/link'
import { SITE } from '@/lib/config'

const POLICY_LINKS = [
	{ href: '/terms', label: 'Terms & Conditions' },
	{ href: '/privacy', label: 'Privacy Policy' },
	{ href: '/refund', label: 'Refund & Cancellation' },
	{ href: '/shipping', label: 'Shipping Policy' },
	{ href: '/contact', label: 'Contact Us' },
]

export function SiteFooter() {
	return (
		<footer className="site-footer">
			<div className="site-footer__inner">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
					<Link href="/" className="brand" style={{ fontSize: 18 }}>
						<span className="brand-dot" />
						{SITE.name}
					</Link>
					<nav className="site-footer__links" aria-label="Policies">
						{POLICY_LINKS.map((link) => (
							<Link key={link.href} href={link.href}>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<p className="site-footer__disclaimer">{SITE.disclaimer}</p>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
					<p className="meta-note" style={{ margin: 0, color: 'var(--text-muted)' }}>
						&copy; {new Date().getFullYear()} {SITE.name}. Independent student initiative.
					</p>
				</div>
			</div>
		</footer>
	)
}
