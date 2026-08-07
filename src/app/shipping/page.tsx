import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/lib/config'

export const metadata: Metadata = {
	title: 'Shipping & Delivery Policy',
	description: `${SITE.name} sells a digital product - here is how and when it is delivered.`,
}

export default function ShippingPage() {
	return (
		<div className="page-shell">
			<h1>Shipping &amp; Delivery Policy</h1>
			<div className="prose">
				<p className="lede">
					{SITE.name} sells a purely digital product - display space on a web page. There is nothing
					physical to ship.
				</p>

				<div className="callout">
					<strong>Not affiliated with the university.</strong> {SITE.disclaimer}
				</div>

				<h2>What you receive</h2>
				<p>
					Your purchase is a block (or group of blocks) on the wall showing your image and linking to
					your chosen URL. No physical goods are dispatched.
				</p>

				<h2>Delivery timeline</h2>
				<ul>
					<li>
						<strong>Immediately after payment:</strong> your blocks are published instantly to the wall
						and you receive a confirmation with your order reference by email. That is delivery.
					</li>
					<li>
						<strong>If removed:</strong> if your block violates our content rules and is removed, you 
						are refunded in full and the blocks return to the wall.
					</li>
				</ul>

				<h2>Delivery confirmation</h2>
				<p>
					We email you when your block goes live. You can also visit the wall and click your block to
					confirm the image and link are correct.
				</p>

				<h2>Something wrong?</h2>
				<p>
					If your block does not appear immediately after payment, or the image or link is wrong,
					please <Link href="/contact">contact us</Link>. We will investigate and make it right.
				</p>

				<p className="meta-note">Last updated: 13 August 2026. {SITE.disclaimer}</p>
			</div>
		</div>
	)
}
