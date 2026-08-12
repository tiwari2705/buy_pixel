import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { PRICING, SITE, TOTAL_BLOCKS } from '@/lib/config'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
	metadataBase: new URL(SITE.url),
	title: {
		default: `${SITE.name} - the LPU student pixel wall`,
		template: `%s - ${SITE.name}`,
	},
	description: `A 1000 x 1000 pixel wall of ${TOTAL_BLOCKS.toLocaleString('en-IN')} blocks. Buy a 10 x 10 block for Rs ${PRICING.pricePerBlockInr}, upload your photo and link it anywhere. An independent student project.`,
	openGraph: {
		title: `${SITE.name} - the LPU student pixel wall`,
		description: `Buy a 10 x 10 block for Rs ${PRICING.pricePerBlockInr} and put your photo and link on the wall.`,
		url: SITE.url,
		siteName: SITE.name,
		type: 'website',
	},
	twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 5,
	themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-theme="light" suppressHydrationWarning>
			<body suppressHydrationWarning>
				<div className="app-shell">
					<a className="skip-link" href="#main">
						Skip to content
					</a>

					<SiteHeader />

					<main className="app-main" id="main">
						{children}
					</main>

					<SiteFooter />
				</div>

				<Analytics />

				{/* Google Analytics */}
				<Script
					src="https://www.googletagmanager.com/gtag/js?id=G-9ZZ0S726KB"
					strategy="afterInteractive"
				/>

				<Script id="google-analytics" strategy="afterInteractive">
					{`
						window.dataLayer = window.dataLayer || [];
						function gtag(){window.dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', 'G-9ZZ0S726KB');
					`}
				</Script>
			</body>
		</html>
	)
}
