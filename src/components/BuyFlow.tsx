'use client'

/**
 * The whole purchase flow on one route:
 *   1. pick a rectangle of free blocks
 *   2. buyer details + image upload with a cropped live preview
 *   3. Razorpay Checkout (order created and priced on the server)
 *   4. confirmation, polled from the server until the webhook lands
 */

import Link from 'next/link'
import Script from 'next/script'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LiveBlock } from '@/lib/blocks'
import { GRID } from '@/lib/config'
import { PixelGrid, type Selection } from './PixelGrid'

type Availability = {
	occupied: number[]
	blocks: LiveBlock[]
	stats: { sold: number; remaining: number; total: number }
	pricing: { pricePerBlockInr: number; pricePerBlockPaise: number; currency: string }
}

type OrderResponse = {
	blockId: string
	razorpayOrderId: string
	razorpayKeyId: string
	amountPaise: number
	currency: string
	blocks: number
	selection: Selection
	reservedUntil: string
	reservationMinutes: number
	siteName: string
	buyer: { name: string; email: string }
}

type AppliedCoupon = {
	code: string
	discountType: string
	discountValue: number
	discountPaise: number
	finalAmountPaise: number
	isFree: boolean
}

type Step = 1 | 2 | 3 | 4

type FormValues = {
	name: string
	email: string
	linkUrl: string
	description: string
	agreedToTerms: boolean
}

type Uploaded = { imageUrl: string; imageWidth: number; imageHeight: number }

declare global {
	interface Window {
		Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
	}
}

function rupees(paise: number): string {
	return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function BuyFlow() {
	const [availability, setAvailability] = useState<Availability | null>(null)
	const [loadError, setLoadError] = useState('')
	const [step, setStep] = useState<Step>(1)
	const [selection, setSelection] = useState<Selection | null>(null)
	const [selectionNotice, setSelectionNotice] = useState('')

	const [values, setValues] = useState<FormValues>({
		name: '',
		email: '',
		linkUrl: '',
		description: '',
		agreedToTerms: false,
	})
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [formError, setFormError] = useState('')

	// Coupon State
	const [couponInput, setCouponInput] = useState('')
	const [couponValidating, setCouponValidating] = useState(false)
	const [couponError, setCouponError] = useState('')
	const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

	const [localPreview, setLocalPreview] = useState<string | null>(null)
	const [uploaded, setUploaded] = useState<Uploaded | null>(null)
	const [uploading, setUploading] = useState(false)

	const [order, setOrder] = useState<OrderResponse | null>(null)
	const [paying, setPaying] = useState(false)
	const [payError, setPayError] = useState('')
	const [orderStatus, setOrderStatus] = useState<string>('')
	const [razorpayReady, setRazorpayReady] = useState(false)

	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const stepsRef = useRef<HTMLOListElement | null>(null)

	// Smooth scroll to top of form/step header whenever step changes
	useEffect(() => {
		if (step > 1 && stepsRef.current) {
			const yOffset = -80 // Offset for sticky header
			const element = stepsRef.current
			const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
			window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
		}
	}, [step])

	/* ----------------------------------------------------------- load data */
	const loadAvailability = useCallback(async () => {
		try {
			const response = await fetch('/api/blocks/availability', { cache: 'no-store' })
			if (!response.ok) throw new Error('failed')
			setAvailability((await response.json()) as Availability)
			setLoadError('')
		} catch {
			setLoadError('Could not load the wall. Reload the page to try again.')
		}
	}, [])

	useEffect(() => {
		void loadAvailability()
	}, [loadAvailability])

	useEffect(() => {
		return () => {
			if (localPreview) URL.revokeObjectURL(localPreview)
		}
	}, [localPreview])

	const occupied = useMemo(
		() => new Set(availability?.occupied ?? []),
		[availability?.occupied],
	)

	const pricePerBlockPaise = availability?.pricing.pricePerBlockPaise ?? 1000
	const blocks = selection ? selection.width * selection.height : 0
	const totalPaise = blocks * pricePerBlockPaise
	const discountPaise = appliedCoupon ? appliedCoupon.discountPaise : 0
	const finalTotalPaise = appliedCoupon ? appliedCoupon.finalAmountPaise : totalPaise
	const requiredWidth = selection ? selection.width * GRID.blockPixelSize : 0
	const requiredHeight = selection ? selection.height * GRID.blockPixelSize : 0

	async function applyCoupon() {
		if (!selection || !couponInput.trim()) return
		setCouponError('')
		setCouponValidating(true)
		try {
			const res = await fetch('/api/coupons/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: couponInput.trim(),
					amountPaise: totalPaise,
				}),
			})
			const data = await res.json()
			if (!res.ok) {
				setCouponError(data.error ?? 'Invalid coupon code.')
				setAppliedCoupon(null)
				return
			}
			setAppliedCoupon(data)
			setCouponError('')
		} catch {
			setCouponError('Failed to validate coupon code.')
		} finally {
			setCouponValidating(false)
		}
	}

	function removeCoupon() {
		setAppliedCoupon(null)
		setCouponInput('')
		setCouponError('')
	}

	/* ------------------------------------------------------------- step 1 */
	function onSelectionChange(next: Selection | null) {
		setSelection(next)
		setSelectionNotice('')
		// A different area may need a different minimum image size.
		if (uploaded && next) {
			const needsW = next.width * GRID.blockPixelSize
			const needsH = next.height * GRID.blockPixelSize
			if (uploaded.imageWidth < needsW || uploaded.imageHeight < needsH) {
				setUploaded(null)
				setFieldErrors((current) => ({
					...current,
					image: `Your image is too small for this area. Upload one at least ${needsW} x ${needsH}px.`,
				}))
			}
		}
	}

	/* ------------------------------------------------------------- step 2 */
	function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
		setValues((current) => ({ ...current, [key]: value }))
		setFieldErrors((current) => ({ ...current, [key]: '' }))
		setFormError('')
	}

	async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		setFieldErrors((current) => ({ ...current, image: '' }))
		setUploaded(null)
		if (!file) return

		if (localPreview) URL.revokeObjectURL(localPreview)
		setLocalPreview(URL.createObjectURL(file))

		if (!selection) {
			setFieldErrors((current) => ({ ...current, image: 'Choose your blocks first.' }))
			return
		}

		const formData = new FormData()
		formData.set('file', file)
		formData.set('selectionWidth', String(selection.width))
		formData.set('selectionHeight', String(selection.height))

		setUploading(true)
		try {
			const response = await fetch('/api/uploads', { method: 'POST', body: formData })
			const data = (await response.json()) as Uploaded & { error?: string }
			if (!response.ok) {
				setFieldErrors((current) => ({ ...current, image: data.error ?? 'Upload failed.' }))
				return
			}
			setUploaded({
				imageUrl: data.imageUrl,
				imageWidth: data.imageWidth,
				imageHeight: data.imageHeight,
			})
		} catch {
			setFieldErrors((current) => ({ ...current, image: 'Upload failed. Please try again.' }))
		} finally {
			setUploading(false)
		}
	}

	function validateForm(): boolean {
		const errors: Record<string, string> = {}
		const name = values.name.trim()
		if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2 to 60 characters.'
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
			errors.email = 'Enter a valid email address.'
		}
		const trimmedLink = values.linkUrl.trim()
		if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) {
			errors.linkUrl = 'Link must start with http:// or https://'
		}
		const description = values.description.trim()
		if (description.length < 3) errors.description = 'Add a short description.'
		if (description.length > 150) errors.description = 'Description must be 150 characters or fewer.'
		if (!uploaded) errors.image = 'Upload your image and wait for it to finish.'
		if (!values.agreedToTerms) errors.agreedToTerms = 'Please accept the Terms & Conditions.'

		setFieldErrors(errors)
		return Object.keys(errors).length === 0
	}

	/* ------------------------------------------------------------- step 3 */
	async function createOrder() {
		if (!selection || !uploaded) return
		setPayError('')
		setPaying(true)

		try {
			const response = await fetch('/api/orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					selection,
					couponCode: appliedCoupon?.code,
					buyer: {
						name: values.name.trim(),
						email: values.email.trim(),
						linkUrl: values.linkUrl.trim(),
						description: values.description.trim(),
						imageUrl: uploaded.imageUrl,
						imageWidth: uploaded.imageWidth,
						imageHeight: uploaded.imageHeight,
						agreedToTerms: true,
					},
				}),
			})

			const data = (await response.json()) as OrderResponse & {
				isFreeOrder?: boolean
				error?: string
				code?: string
				fields?: Record<string, string>
			}

			if (!response.ok) {
				if (data.code === 'BLOCKS_TAKEN') {
					setSelection(null)
					setStep(1)
					setSelectionNotice(data.error ?? 'Those blocks were just taken.')
					await loadAvailability()
					return
				}
				if (data.fields) {
					setFieldErrors(data.fields)
					setStep(2)
					setFormError(data.error ?? 'Please fix the highlighted fields.')
					return
				}
				setPayError(data.error ?? 'Could not start the payment.')
				return
			}

			if (data.isFreeOrder) {
				setOrder(data)
				setOrderStatus('live')
				setStep(4)
				return
			}

			setOrder(data)
			openCheckout(data)
		} catch {
			setPayError('Network error. Please try again.')
		} finally {
			setPaying(false)
		}
	}

	function openCheckout(created: OrderResponse) {
		if (!window.Razorpay) {
			setPayError('Payment library is still loading. Try again in a second.')
			return
		}

		const checkout = new window.Razorpay({
			key: created.razorpayKeyId,
			order_id: created.razorpayOrderId,
			amount: created.amountPaise,
			currency: created.currency,
			name: created.siteName,
			description: `${created.blocks} block${created.blocks === 1 ? '' : 's'} on the wall`,
			prefill: { name: created.buyer.name, email: created.buyer.email },
			notes: { blockId: created.blockId },
			theme: { color: '#2783DE' },
			// The browser never confirms payment - we always wait for the webhook.
			handler: () => {
				setStep(4)
				void pollOrder(created.blockId)
			},
			modal: {
				ondismiss: () => {
					setPayError(
						`Payment window closed. Your blocks stay reserved for about ${created.reservationMinutes} minutes.`,
					)
				},
			},
		})
		checkout.open()
	}

	/* ------------------------------------------------------------- step 4 */
	const pollOrder = useCallback(async (blockId: string) => {
		for (let attempt = 0; attempt < 20; attempt += 1) {
			try {
				const response = await fetch(`/api/orders/${blockId}`, { cache: 'no-store' })
				if (response.ok) {
					const data = (await response.json()) as { status: string }
					setOrderStatus(data.status)
					if (data.status === 'pending_review' || data.status === 'live') return
				}
			} catch {
				// keep polling
			}
			await new Promise((resolve) => setTimeout(resolve, 3000))
		}
	}, [])

	/* ---------------------------------------------------------------- view */
	if (loadError) {
		return (
			<p className="alert alert--error" role="alert">
				{loadError}
			</p>
		)
	}

	if (!availability) {
		return <p className="alert alert--info">Loading the wall...</p>
	}

	if (step === 4) {
		return (
			<div className="panel">
				<h2 className="panel__title">Payment received</h2>
				<p className="alert alert--success">
					Thank you. Your block is now live on the wall! We have emailed your receipt.
				</p>
				<dl className="kv">
					<dt>Order ID</dt>
					<dd>{order?.razorpayOrderId ?? '-'}</dd>
					<dt>Blocks</dt>
					<dd>
						{order?.blocks} ({order?.selection.width} x {order?.selection.height} at (
						{order?.selection.x}, {order?.selection.y}))
					</dd>
					<dt>Amount paid</dt>
					<dd>{order ? rupees(order.amountPaise) : '-'}</dd>
					<dt>Status</dt>
					<dd>
						{orderStatus === 'pending_review'
							? 'Paid - awaiting review'
							: orderStatus === 'live'
								? 'Live on the wall'
								: 'Confirming payment with Razorpay...'}
					</dd>
				</dl>
				<div className="form-actions">
					<Link href="/" className="button button--primary">
						Go to the wall
					</Link>
				</div>
			</div>
		)
	}

	return (
		<>
			<Script
				src="https://checkout.razorpay.com/v1/checkout.js"
				strategy="afterInteractive"
				onLoad={() => setRazorpayReady(true)}
			/>

			<ol className="steps" ref={stepsRef}>
				<li data-active={step === 1 ? 'true' : undefined}>1. Select Area</li>
				<li data-active={step === 2 ? 'true' : undefined}>2. Details &amp; Image</li>
				<li data-active={step === 3 ? 'true' : undefined}>3. Checkout</li>
				<li data-active={(step as number) === 4 ? 'true' : undefined}>4. Live!</li>
			</ol>

			<div className="buy-layout">
				<div>
					{step === 1 && (
						<>
							<h2>Step 1 - Choose your blocks</h2>
							<p className="hint">
								Drag a rectangle over any free area. Grey blocks are already taken and cannot be
								selected - a rectangle that overlaps them is rejected, so move or resize it. Keyboard:
								focus the wall, move with the arrow keys, resize with Shift + arrows, select with Enter.
							</p>
							{selectionNotice && (
								<p className="alert alert--error" role="alert">
									{selectionNotice}
								</p>
							)}
							<PixelGrid
								mode="select"
								blocks={availability.blocks}
								occupied={occupied}
								selection={selection}
								onSelectionChange={onSelectionChange}
								onSelectionRejected={setSelectionNotice}
							/>
						</>
					)}

					{step === 2 && (
						<form
							className="panel"
							noValidate
							onSubmit={(event) => {
								event.preventDefault()
								if (validateForm()) setStep(3)
							}}
						>
							<h2 className="panel__title">Step 2 - Your details</h2>

							{formError && (
								<p className="alert alert--error" role="alert">
									{formError}
								</p>
							)}

							<div className="field">
								<label htmlFor="buy-name">Name</label>
								<input
									id="buy-name"
									type="text"
									autoComplete="name"
									maxLength={60}
									required
									value={values.name}
									onChange={(event) => update('name', event.target.value)}
									aria-invalid={fieldErrors.name ? 'true' : undefined}
									aria-describedby={fieldErrors.name ? 'buy-name-error' : undefined}
								/>
								{fieldErrors.name && (
									<p className="field__error" id="buy-name-error">
										{fieldErrors.name}
									</p>
								)}
							</div>

							<div className="field">
								<label htmlFor="buy-email">Email</label>
								<input
									id="buy-email"
									type="email"
									autoComplete="email"
									required
									value={values.email}
									onChange={(event) => update('email', event.target.value)}
									aria-invalid={fieldErrors.email ? 'true' : undefined}
									aria-describedby="buy-email-hint"
								/>
								<p className="hint" id="buy-email-hint">
									Your receipt and the approval notice are sent here.
								</p>
								{fieldErrors.email && <p className="field__error">{fieldErrors.email}</p>}
							</div>

							<div className="field">
								<label htmlFor="buy-link">Link (optional)</label>
								<input
									id="buy-link"
									type="url"
									placeholder="https://instagram.com/yourpage"
									value={values.linkUrl}
									onChange={(event) => update('linkUrl', event.target.value)}
									aria-invalid={fieldErrors.linkUrl ? 'true' : undefined}
								/>
								<p className="hint">Optional. Where your block opens when someone clicks it.</p>
								{fieldErrors.linkUrl && <p className="field__error">{fieldErrors.linkUrl}</p>}
							</div>

							<div className="field">
								<label htmlFor="buy-description">Short description</label>
								<textarea
									id="buy-description"
									maxLength={150}
									required
									value={values.description}
									onChange={(event) => update('description', event.target.value)}
									aria-invalid={fieldErrors.description ? 'true' : undefined}
								/>
								<p className="hint">
									Shown in the hover tooltip. {150 - values.description.length} characters left.
								</p>
								{fieldErrors.description && <p className="field__error">{fieldErrors.description}</p>}
							</div>

							<div className="field">
								<label htmlFor="buy-image">Photo or logo</label>
								<input
									id="buy-image"
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									required
									onChange={onFileChange}
									aria-invalid={fieldErrors.image ? 'true' : undefined}
								/>
								<p className="hint">
									JPG, PNG, WebP or GIF, up to 2 MB. For this selection it must be at least{' '}
									{requiredWidth} x {requiredHeight} pixels.
								</p>
								{uploading && <p className="hint">Uploading...</p>}
								{uploaded && !uploading && (
									<p className="hint">
										Uploaded: {uploaded.imageWidth} x {uploaded.imageHeight}px.
									</p>
								)}
								{fieldErrors.image && <p className="field__error">{fieldErrors.image}</p>}
							</div>

							{localPreview && selection && (
								<div className="preview-box">
									<p className="hint">
										Preview, cropped to your {selection.width} x {selection.height} block area:
									</p>
									<div
										className="preview-frame"
										style={{ aspectRatio: `${selection.width} / ${selection.height}` }}
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img src={localPreview} alt="Preview of your uploaded image" />
									</div>
								</div>
							)}

							<div className="field checkbox-field">
								<input
									id="buy-terms"
									type="checkbox"
									checked={values.agreedToTerms}
									onChange={(event) => update('agreedToTerms', event.target.checked)}
									aria-invalid={fieldErrors.agreedToTerms ? 'true' : undefined}
								/>
								<label htmlFor="buy-terms">
									I agree to the <Link href="/terms">Terms &amp; Conditions</Link> and confirm I own
									the rights to this image.
								</label>
							</div>
							{fieldErrors.agreedToTerms && (
								<p className="field__error">{fieldErrors.agreedToTerms}</p>
							)}

							<div className="form-actions">
								<button type="button" className="button" onClick={() => setStep(1)}>
									Back to the wall
								</button>
								<button type="submit" className="button button--primary" disabled={uploading}>
									Review and pay
								</button>
							</div>
						</form>
					)}

					{step === 3 && selection && (
						<div className="panel">
							<h2 className="panel__title">Step 3 - Pay</h2>
							{payError && (
								<p className="alert alert--error" role="alert">
									{payError}
								</p>
							)}
							<dl className="kv">
								<dt>Name</dt>
								<dd>{values.name}</dd>
								<dt>Email</dt>
								<dd>{values.email}</dd>
								<dt>Link</dt>
								<dd>{values.linkUrl}</dd>
								<dt>Description</dt>
								<dd>{values.description}</dd>
								<dt>Area</dt>
								<dd>
									{selection.width} x {selection.height} blocks at ({selection.x}, {selection.y})
								</dd>
								{appliedCoupon && (
									<>
										<dt>Subtotal</dt>
										<dd>{rupees(totalPaise)}</dd>
										<dt>Discount ({appliedCoupon.code})</dt>
										<dd style={{ color: 'var(--positive)', fontWeight: 600 }}>-{rupees(discountPaise)}</dd>
									</>
								)}
								<dt>Total payable</dt>
								<dd style={{ fontWeight: 800, fontSize: 18, color: finalTotalPaise === 0 ? 'var(--positive)' : 'var(--text-primary)' }}>
									{finalTotalPaise === 0 ? 'FREE (100% OFF)' : rupees(finalTotalPaise)}
								</dd>
							</dl>
							{finalTotalPaise === 0 ? (
								<p className="hint" style={{ color: 'var(--positive)' }}>
									You have applied a 100% discount coupon! No payment is required. Click below to claim your block.
								</p>
							) : (
								<p className="hint">
									Payment is handled by Razorpay - UPI, cards, netbanking and wallets. We never see or
									store your card or UPI details. Your blocks are held for you while you pay.
								</p>
							)}
							<div className="form-actions">
								<button type="button" className="button" onClick={() => setStep(2)}>
									Edit details
								</button>
								<button
									type="button"
									className="button button--primary"
									onClick={() => (finalTotalPaise === 0 ? void createOrder() : order ? openCheckout(order) : void createOrder())}
									disabled={paying || (finalTotalPaise > 0 && !razorpayReady)}
								>
									{paying
										? 'Processing...'
										: finalTotalPaise === 0
											? 'Claim Free Block'
											: razorpayReady
												? `Pay ${rupees(finalTotalPaise)}`
												: 'Loading payment...'}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* live summary, always visible */}
				<aside className="panel panel--sticky" aria-live="polite">
					<h2 className="panel__title">Your selection</h2>
					<div className="summary-row">
						<span className="summary-row__label">Area</span>
						<span>{selection ? `${selection.width} × ${selection.height}` : '-'}</span>
					</div>
					<div className="summary-row">
						<span className="summary-row__label">Position</span>
						<span>{selection ? `(${selection.x}, ${selection.y})` : '-'}</span>
					</div>
					<div className="summary-row">
						<span className="summary-row__label">Blocks</span>
						<span>{blocks}</span>
					</div>
					<div className="summary-row">
						<span className="summary-row__label">Price per block</span>
						<span>{rupees(pricePerBlockPaise)}</span>
					</div>

					{appliedCoupon ? (
						<>
							<div className="summary-row">
								<span className="summary-row__label">Subtotal</span>
								<span>{rupees(totalPaise)}</span>
							</div>
							<div className="summary-row" style={{ color: 'var(--positive)' }}>
								<span className="summary-row__label" style={{ color: 'var(--positive)' }}>Discount ({appliedCoupon.code})</span>
								<span>-{rupees(discountPaise)}</span>
							</div>
							<div className="summary-row">
								<span className="summary-row__label">Total</span>
								<span className="summary-total" style={{ color: finalTotalPaise === 0 ? 'var(--positive)' : undefined }}>
									{finalTotalPaise === 0 ? 'FREE' : rupees(finalTotalPaise)}
								</span>
							</div>
						</>
					) : (
						<div className="summary-row">
							<span className="summary-row__label">Total</span>
							<span className="summary-total">{rupees(totalPaise)}</span>
						</div>
					)}

					<div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
						<label htmlFor="coupon-input" className="summary-row__label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
							Have a Coupon Code?
						</label>
						{appliedCoupon ? (
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--positive-soft)', border: '1px solid var(--positive)', borderRadius: 6 }}>
								<div>
									<strong style={{ color: 'var(--positive)', fontSize: 14 }}>{appliedCoupon.code}</strong>
									<span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
										(-{rupees(appliedCoupon.discountPaise)})
									</span>
								</div>
								<button
									type="button"
									onClick={removeCoupon}
									style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
									title="Remove coupon"
								>
									&times;
								</button>
							</div>
						) : (
							<div>
								<div style={{ display: 'flex', gap: 8 }}>
									<input
										id="coupon-input"
										type="text"
										placeholder="Enter code"
										value={couponInput}
										onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
										disabled={!selection || couponValidating}
										style={{ flex: 1, padding: '6px 10px', textTransform: 'uppercase', fontSize: 13, height: 36 }}
									/>
									<button
										type="button"
										className="button button--sm"
										onClick={applyCoupon}
										disabled={!selection || !couponInput.trim() || couponValidating}
										style={{ height: 36, padding: '0 12px' }}
									>
										{couponValidating ? '...' : 'Apply'}
									</button>
								</div>
								{couponError && <p className="field__error" style={{ marginTop: 4 }}>{couponError}</p>}
							</div>
						)}
					</div>

					<div className="form-actions" style={{ marginTop: 16 }}>
						{step === 1 && (
							<button
								type="button"
								className="button button--primary"
								disabled={!selection}
								onClick={() => setStep(2)}
							>
								Continue
							</button>
						)}
						<button
							type="button"
							className="button"
							disabled={!selection}
							onClick={() => {
								setSelection(null)
								setSelectionNotice('')
								setStep(1)
								removeCoupon()
							}}
						>
							Clear selection
						</button>
					</div>

					<p className="hint">
						{availability.stats.remaining.toLocaleString('en-IN')} of{' '}
						{availability.stats.total.toLocaleString('en-IN')} blocks still free.
					</p>
				</aside>
			</div>
		</>
	)
}
