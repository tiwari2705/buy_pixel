'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SITE } from '@/lib/config'
import { ThemeToggle } from './ThemeToggle'

const LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/buy', label: 'Buy Pixels' },
	{ href: '/about', label: 'About' },
	{ href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
	const pathname = usePathname()

	return (
		<header className="site-header">
			<div className="site-header__inner">
				<Link href="/" className="brand">
					<span className="brand-dot" />
					{SITE.name}
				</Link>
				<nav className="nav" aria-label="Main">
					{LINKS.filter((link) => link.href !== '/buy').map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="nav__link"
							aria-current={pathname === link.href ? 'page' : undefined}
						>
							{link.label}
						</Link>
					))}
					<ThemeToggle />
					<Link href="/buy" className="button button--primary button--sm">
						Buy Pixels
					</Link>
				</nav>
			</div>
		</header>
	)
}
