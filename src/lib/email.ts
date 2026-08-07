import { Resend } from 'resend'
import { SITE, formatInr } from './config'
import { escapeHtml } from './sanitize'

let resend: Resend | null = null

function client(): Resend | null {
	const key = process.env.RESEND_API_KEY
	if (!key) return null
	if (!resend) resend = new Resend(key)
	return resend
}

async function send(to: string, subject: string, html: string) {
	const mailer = client()
	if (!mailer) {
		console.warn(`[email skipped: RESEND_API_KEY missing] ${subject} -> ${to}`)
		return
	}
	try {
		const fromEmail = process.env.EMAIL_FROM ?? `no-reply@${new URL(SITE.url).hostname}`
		let result = await mailer.emails.send({
			from: fromEmail,
			to,
			subject,
			html,
		})

		if (result.error) {
			console.error('[email send error with custom domain]:', result.error)
			// If domain is unverified, attempt fallback to Resend onboarding address
			if (fromEmail !== 'onboarding@resend.dev') {
				console.log('[email attempting fallback via onboarding@resend.dev]...')
				result = await mailer.emails.send({
					from: 'onboarding@resend.dev',
					to,
					subject: `[sayitlpu] ${subject}`,
					html,
				})
				if (result.error) {
					console.error('[email fallback failed]:', result.error)
				} else {
					console.log('[email sent via fallback onboarding@resend.dev]:', result.data)
				}
			}
		} else {
			console.log('[email sent successfully]:', result.data)
		}
	} catch (error) {
		// Email must never break the payment or moderation flow.
		console.error('[email failed exception]', error)
	}
}

function shell(title: string, body: string): string {
	return `<!doctype html><html><body style="margin:0;background:#F9F8F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2C2C2B">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:14px;color:#7D7A75;margin-bottom:16px">${escapeHtml(SITE.name)}</div>
    <div style="background:#FFFFFF;border:1px solid #E6E5E3;border-radius:8px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
    </div>
    <p style="font-size:12px;color:#7D7A75;line-height:1.5;margin-top:24px">
      ${escapeHtml(SITE.legalEntity)} &middot; ${escapeHtml(SITE.contactAddress)}<br/>
      GSTIN: ${escapeHtml(SITE.gstin)} &middot; ${escapeHtml(SITE.contactEmail)} &middot; ${escapeHtml(SITE.contactPhone)}<br/><br/>
      ${escapeHtml(SITE.disclaimer)}
    </p>
  </div>
</body></html>`
}

function row(label: string, value: string): string {
	return `<tr><td style="padding:6px 0;color:#7D7A75;font-size:14px">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;text-align:right">${escapeHtml(value)}</td></tr>`
}

export type ReceiptData = {
	buyerName: string
	buyerEmail: string
	orderId: string
	paymentId: string
	blockCount: number
	amountPaise: number
	selection: { x: number; y: number; width: number; height: number }
}

export async function sendReceiptEmail(data: ReceiptData) {
	const body = `
    <p style="font-size:15px;line-height:1.5">Hi ${escapeHtml(data.buyerName)}, your payment was received. Thank you for backing the wall.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${row('Order ID', data.orderId)}
      ${row('Payment ID', data.paymentId)}
      ${row('Blocks purchased', `${data.blockCount} (${data.selection.width} x ${data.selection.height})`)}
      ${row('Position (x, y)', `${data.selection.x}, ${data.selection.y}`)}
      ${row('Amount paid', formatInr(data.amountPaise))}
    </table>
    <p style="font-size:14px;line-height:1.5;color:#7D7A75">Your block is now live on the wall!</p>
    <p style="font-size:12px;color:#7D7A75">This email is your receipt / tax invoice. Payment was processed by Razorpay; we never store your card or UPI details.</p>`
	await send(data.buyerEmail, `Receipt for order ${data.orderId} - ${SITE.name}`, shell('Payment received', body))
}

export async function sendApprovalEmail(params: {
	buyerName: string
	buyerEmail: string
	orderId: string
}) {
	const body = `
    <p style="font-size:15px;line-height:1.5">Good news ${escapeHtml(params.buyerName)} - your block has been approved and is now live on the wall.</p>
    <p style="font-size:15px"><a href="${SITE.url}" style="color:#2783DE">View the wall</a></p>
    <p style="font-size:14px;color:#7D7A75">Order ${escapeHtml(params.orderId)}</p>`
	await send(params.buyerEmail, `Your block is live - ${SITE.name}`, shell('Your block is live', body))
}

export async function sendRejectionEmail(params: {
	buyerName: string
	buyerEmail: string
	orderId: string
	reason: string
	amountPaise: number
}) {
	const body = `
    <p style="font-size:15px;line-height:1.5">Hi ${escapeHtml(params.buyerName)}, unfortunately your submission could not be approved.</p>
    <p style="font-size:15px;line-height:1.5"><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>
    <p style="font-size:14px;line-height:1.5">A full refund of ${escapeHtml(formatInr(params.amountPaise))} has been initiated and should reach your original payment method within 5-7 business days. Your blocks have been released back to the wall.</p>
    <p style="font-size:14px;color:#7D7A75">Order ${escapeHtml(params.orderId)}. Reply to this email if you would like to submit a different image.</p>`
	await send(
		params.buyerEmail,
		`Submission rejected and refunded - ${SITE.name}`,
		shell('Submission rejected', body),
	)
}

export async function sendContactNotification(params: {
	name: string
	email: string
	subject: string
	message: string
}) {
	const inbox = process.env.CONTACT_INBOX_EMAIL ?? SITE.contactEmail
	if (!inbox || inbox.startsWith('[')) return
	const body = `
    <table style="width:100%;border-collapse:collapse">
      ${row('From', params.name)}
      ${row('Email', params.email)}
      ${row('Subject', params.subject)}
    </table>
    <p style="font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(params.message)}</p>`
	await send(inbox, `[Contact] ${params.subject}`, shell('New contact message', body))
}
