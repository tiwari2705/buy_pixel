import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE, formatInr, pricePerBlockPaise } from '@/lib/config'

export const metadata: Metadata = {
	title: 'Terms & Conditions',
	description: `The rules for buying and displaying a block on ${SITE.name}.`,
}

export default function TermsPage() {
	return (
		<div className="page-shell">
			<h1>Terms &amp; Conditions</h1>
			<div className="prose">
				<p className="lede">
					These terms govern your purchase and use of a block on {SITE.name}. By buying a block you
					agree to them. Please read them before you pay.
				</p>

				<div className="callout">
					<strong>Not affiliated with the university.</strong> {SITE.disclaimer}
				</div>

				<h2>1. Who we are</h2>
				<p>
					{SITE.name} (&quot;we&quot;, &quot;us&quot;, the &quot;site&quot;) is operated by{' '}
					{SITE.legalEntity}. You can reach us at{' '}
					<a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
				</p>

				<h2>2. What you are buying</h2>
				<p>
					A block is a {formatInr(pricePerBlockPaise)} slot of 10 x 10 pixels on the wall. You may buy
					one block or many blocks in a single rectangular area. When approved, your image is
					displayed in that area and clicking it opens the link you provided in a new tab. Blocks are
					sold once and are intended to remain in place permanently for as long as the site operates.
					You are buying display space, not the underlying pixels, software or any intellectual
					property in the site.
				</p>

				<h2>3. Instant Publication and Post-Moderation</h2>
				<p>
					Blocks are published instantly upon successful payment. However, we actively monitor the wall. If your block violates our content rules, we reserve the right to remove it. If we remove a block for a content violation, you will be refunded in full and the blocks will return to the wall.
				</p>

				<h2>4. Content rules</h2>
				<p>You confirm that your image, link and description do not contain or lead to:</p>
				<ul>
					<li>Adult or sexually explicit content;</li>
					<li>Hate speech, harassment or content targeting a person or group;</li>
					<li>Violence, gore or shocking imagery;</li>
					<li>Illegal goods, services or activity under Indian law;</li>
					<li>Malware, phishing, deceptive redirects or links that harm the visitor;</li>
					<li>
						Anything that impersonates Lovely Professional University or presents itself as an
						official university communication, or that uses university logos or official branding;
					</li>
					<li>Images or trademarks you do not own or have permission to use.</li>
				</ul>
				<p>
					We may reject or later remove any block that breaks these rules. Where a block is removed
					after going live because it broke these rules or the law, no refund is due.
				</p>

				<h2>5. Your responsibilities</h2>
				<p>
					You are solely responsible for the image, link and description you submit and for keeping
					the linked destination lawful and safe over time. You grant us a non-exclusive licence to
					display your image on the wall and in screenshots of the wall. You retain ownership of your
					image.
				</p>

				<h2>6. Payments</h2>
				<p>
					Payments are processed by Razorpay. The price is {formatInr(pricePerBlockPaise)} per block
					and the total is always calculated on our server from the number of blocks in your
					selection. We do not store your card or UPI details.
				</p>

				<h2>7. Refunds and cancellation</h2>
				<p>
					Refunds are governed by our <Link href="/refund">Cancellation &amp; Refund Policy</Link>.
					In short: a full refund is issued if we remove your submission for a rule violation; once a
					block is live it is generally non-refundable because the display space has been delivered.
				</p>

				<h2>8. Availability</h2>
				<p>
					We try to keep the site online but we do not guarantee uninterrupted availability. This is
					a self-funded student project provided on an &quot;as is&quot; and &quot;as available&quot;
					basis.
				</p>

				<h2>9. Limitation of liability</h2>
				<p>
					To the fullest extent permitted by law, our total liability to you for any claim relating to
					a block is limited to the amount you paid for that block. We are not liable for indirect or
					consequential loss, or for the content or availability of websites your block links to or
					that link to you.
				</p>

				<h2>10. Governing law</h2>
				<p>
					These terms are governed by the laws of India and the courts at [YOUR CITY], India have
					exclusive jurisdiction.
				</p>

				<h2>11. Changes</h2>
				<p>
					We may update these terms. The current version always lives on this page. Material changes
					will be noted here.
				</p>

				<p className="meta-note">Last updated: 13 August 2026. {SITE.disclaimer}</p>
			</div>
		</div>
	)
}
