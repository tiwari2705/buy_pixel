import type { Metadata } from 'next'
import { SITE } from '@/lib/config'

export const metadata: Metadata = {
	title: 'Privacy Policy',
	description: `What data ${SITE.name} collects and how it is used.`,
}

export default function PrivacyPage() {
	return (
		<div className="page-shell">
			<h1>Privacy Policy</h1>
			<div className="prose">
				<p className="lede">
					This policy explains what information {SITE.name} collects, why, and what your choices are.
					We collect as little as possible.
				</p>

				<div className="callout">
					<strong>Not affiliated with the university.</strong> {SITE.disclaimer}
				</div>

				<h2>1. Who is responsible</h2>
				<p>
					{SITE.legalEntity} operates {SITE.name} and is the data controller. Contact us at{' '}
					<a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> for any privacy question or
					request.
				</p>

				<h2>2. What we collect</h2>
				<ul>
					<li>
						<strong>When you buy a block:</strong> your name, email address, the link and description
						you choose to display, and the image you upload.
					</li>
					<li>
						<strong>Payment data:</strong> handled by Razorpay. We receive a payment and order
						reference and status, never your full card or UPI credentials.
					</li>
					<li>
						<strong>When you use the contact form:</strong> your name, email, subject and message.
					</li>
					<li>
						<strong>Technical data:</strong> we store a one-way hashed form of the IP address on
						clicks and form submissions for rate-limiting and abuse prevention. We do not store the
						raw IP address.
					</li>
				</ul>

				<h2>3. How we use it</h2>
				<ul>
					<li>To display your block and open your link when a visitor clicks it;</li>
					<li>To monitor submissions and to contact you about your purchase or a refund;</li>
					<li>To process payments and issue receipts;</li>
					<li>To prevent spam, fraud and abuse;</li>
					<li>To respond to messages you send us.</li>
				</ul>

				<h2>4. What is public</h2>
				<p>
					Your image, your link and your description are public by design - that is the point of the
					wall. Your email address and payment references are never shown publicly.
				</p>

				<h2>5. Sharing</h2>
				<p>
					We share data only with the service providers that make the site work: our payment
					processor (Razorpay), our database and file-storage host, and our email provider. We do not
					sell your data. We may disclose information if required by law.
				</p>

				<h2>6. Retention</h2>
				<p>
					Because blocks are permanent, the details attached to a live block are kept for as long as
					the block is displayed. Payment records are kept as long as required for tax and accounting.
					Contact messages are kept only as long as needed to resolve your query.
				</p>

				<h2>7. Your rights</h2>
				<p>
					You can ask us to access, correct or delete your personal data by emailing{' '}
					<a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. Note that removing a live
					block&apos;s image and link effectively takes the block down; we will explain the options
					when you write to us.
				</p>

				<h2>8. Cookies</h2>
				<p>
					We use a single essential cookie only for the private admin area so a signed-in administrator
					stays signed in. We do not use advertising or third-party tracking cookies.
				</p>

				<h2>9. Changes</h2>
				<p>We may update this policy; the current version always lives on this page.</p>

				<p className="meta-note">Last updated: 13 August 2026. {SITE.disclaimer}</p>
			</div>
		</div>
	)
}
