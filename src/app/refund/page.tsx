import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE, formatInr, pricePerBlockPaise } from '@/lib/config'

export const metadata: Metadata = {
	title: 'Cancellation & Refund Policy',
	description: `When ${SITE.name} issues refunds for pixel block purchases.`,
}

export default function RefundPage() {
	return (
		<div className="page-shell">
			<h1>Cancellation &amp; Refund Policy</h1>
			<div className="prose">
				<p className="lede">
					We want the wall to be something you are happy to be on. This policy explains exactly when a
					refund applies.
				</p>

				<div className="callout">
					<strong>Not affiliated with the university.</strong> {SITE.disclaimer}
				</div>

				<h2>Full refund - content violation takedown</h2>
				<p>
					If we remove your submission from the wall due to a violation of our content rules, we
					refund {formatInr(pricePerBlockPaise)} per block in full and the blocks return to the wall.
					You do not need to do anything - the refund is issued automatically to your original payment
					method.
				</p>

				<h2>Full refund - duplicate or failed charge</h2>
				<p>
					If you were charged but your blocks were not reserved (for example because someone bought
					the same area a moment earlier, or a technical error occurred), we refund you in full.
				</p>

				<h2>No refund - block is already live</h2>
				<p>
					Once your block is live on the wall, the display space has been
					delivered and the purchase is non-refundable. Blocks are intended to be permanent, so please
					check your image and link carefully before you pay.
				</p>

				<h2>Removed for breaking the rules</h2>
				<p>
					If a live block is removed because it broke our{' '}
					<Link href="/terms">content rules</Link> or the law, no refund is due.
				</p>

				<h2>How and when refunds arrive</h2>
				<p>
					Refunds are processed through Razorpay to your original payment method. Once we initiate a
					refund it typically reaches your account within 5 to 7 business days, depending on your
					bank or UPI provider.
				</p>

				<h2>Cancelling before payment</h2>
				<p>
					You can abandon a purchase at any time before you complete payment and nothing is charged.
					Reserved blocks that are not paid for are released automatically after a short hold.
				</p>

				<h2>Questions</h2>
				<p>
					Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> with your order
					reference and we will help.
				</p>

				<p className="meta-note">Last updated: 13 August 2026. {SITE.disclaimer}</p>
			</div>
		</div>
	)
}
