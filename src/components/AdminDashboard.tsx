'use client'

import { useState } from 'react'
import { formatInr } from '@/lib/config'
import type { WallStats } from '@/lib/blocks'

export type LiveBlockData = {
	id: string
	x: number
	y: number
	width: number
	height: number
	blocks: number
	imageUrl: string
	linkUrl: string
	buyerName: string
	buyerEmail: string
	description: string
	amountPaise: number
	amountLabel: string
	createdAt: string
}

export type TopBuyer = {
	email: string
	name: string
	totalAmountPaise: number
	blocksBought: number
}

export type CouponData = {
	id: string
	code: string
	discountType: string
	discountValue: number
	couponType: 'SINGLE_USE' | 'UNLIMITED'
	isUsed: boolean
	usedAt: string | null
	usedByEmail: string | null
	usageCount: number
	createdAt: string
	creatorPin?: string
}

export type ContactMessageData = {
	id: string
	name: string
	email: string
	subject: string
	message: string
	createdAt: string
}

type AdminDashboardProps = {
	blocks: LiveBlockData[]
	stats: WallStats
	totalRevenuePaise: number
	topBuyers: TopBuyer[]
	initialCoupons?: CouponData[]
	contactMessages?: ContactMessageData[]
}

const INITIAL_VISIBLE = 5

const REJECTION_HINTS = [
	'Adult or sexual content',
	'Hate speech or harassment',
	'Violence or gore',
	'Illegal goods or services',
	'Malware, phishing or hidden redirect',
	'Misleading LPU-official branding',
	'Copyrighted image the buyer does not own',
]

function SeeMoreButton({ total, visible, expanded, onToggle }: { total: number; visible: number; expanded: boolean; onToggle: () => void }) {
	if (total <= visible) return null
	const hidden = total - visible
	return (
		<div style={{ textAlign: 'center', padding: '16px 0' }}>
			<button
				type="button"
				onClick={onToggle}
				style={{
					padding: '10px 28px',
					borderRadius: 8,
					border: '1px solid var(--border-bright)',
					background: 'var(--surface-glass)',
					color: 'var(--accent)',
					fontSize: 13,
					fontWeight: 600,
					cursor: 'pointer',
					transition: 'all 0.2s ease',
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
				}}
			>
				{expanded ? (
					<>Show Less <span style={{ fontSize: 16, lineHeight: 1 }}>↑</span></>
				) : (
					<>See More <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{hidden}</span> <span style={{ fontSize: 16, lineHeight: 1 }}>↓</span></>
				)}
			</button>
		</div>
	)
}

export function AdminDashboard({
	blocks,
	stats,
	totalRevenuePaise,
	topBuyers,
	initialCoupons = [],
	contactMessages = [],
}: AdminDashboardProps) {
	const [items, setItems] = useState(blocks)
	const [busyId, setBusyId] = useState<string | null>(null)
	const [reasons, setReasons] = useState<Record<string, string>>({})
	const [error, setError] = useState<string | null>(null)

	// Coupon management state
	const [coupons, setCoupons] = useState<CouponData[]>(initialCoupons)
	const [newCode, setNewCode] = useState('')
	const [newDiscountType, setNewDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
	const [newDiscountValue, setNewDiscountValue] = useState<string>('')
	const [newCouponType, setNewCouponType] = useState<'SINGLE_USE' | 'UNLIMITED'>('SINGLE_USE')
	const [couponError, setCouponError] = useState<string | null>(null)
	const [couponSuccess, setCouponSuccess] = useState<string | null>(null)
	const [couponBusy, setCouponBusy] = useState(false)

	// Expand/collapse state for each section
	const [showAllCoupons, setShowAllCoupons] = useState(false)
	const [showAllBuyers, setShowAllBuyers] = useState(false)
	const [showAllMessages, setShowAllMessages] = useState(false)
	const [showAllPurchases, setShowAllPurchases] = useState(false)

	function removeItem(id: string) {
		setItems((current) => current.filter((item) => item.id !== id))
	}

	async function reject(id: string) {
		const reason = (reasons[id] ?? '').trim()
		if (reason.length < 5) {
			setError('Enter a short reason (at least 5 characters) for taking down this block - it is emailed to the buyer.')
			return
		}
		if (!window.confirm('Are you sure you want to delete this block and refund the user?')) return
		
		setError(null)
		setBusyId(id)
		try {
			const response = await fetch(`/api/admin/blocks/${id}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason }),
			})
			const data = (await response.json().catch(() => ({}))) as { error?: string; warning?: string }
			if (!response.ok) {
				setError(data.error ?? 'Could not remove this block.')
				return
			}
			if (data.warning) setError(data.warning)
			removeItem(id)
		} catch {
			setError('Network error. Please try again.')
		} finally {
			setBusyId(null)
		}
	}

	async function handleCreateCoupon(e: React.FormEvent) {
		e.preventDefault()
		setCouponError(null)
		setCouponSuccess(null)

		const code = newCode.trim().toUpperCase()
		const val = parseFloat(newDiscountValue)

		if (!code || code.length < 2) {
			setCouponError('Please enter a valid coupon code (min 2 characters).')
			return
		}
		if (isNaN(val) || val <= 0) {
			setCouponError('Discount value must be a positive number.')
			return
		}
		if (newDiscountType === 'PERCENT' && val > 100) {
			setCouponError('Percentage discount cannot exceed 100%.')
			return
		}

		setCouponBusy(true)
		try {
			const res = await fetch('/api/admin/coupons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code,
					discountType: newDiscountType,
					discountValue: val,
					couponType: newCouponType,
				}),
			})
			const data = await res.json()
			if (!res.ok) {
				setCouponError(data.error ?? 'Failed to create coupon.')
				return
			}
			setCoupons((prev) => [
				{
					id: data.coupon.id,
					code: data.coupon.code,
					discountType: data.coupon.discountType,
					discountValue: data.coupon.discountValue,
					couponType: data.coupon.couponType ?? 'SINGLE_USE',
					isUsed: data.coupon.isUsed,
					usedAt: null,
					usedByEmail: null,
					usageCount: data.coupon.usageCount ?? 0,
					createdAt: data.coupon.createdAt ?? new Date().toISOString(),
				},
				...prev,
			])
			setNewCode('')
			setNewDiscountValue('')
			setNewCouponType('SINGLE_USE')
			setCouponSuccess(`Coupon '${code}' created successfully!`)
		} catch {
			setCouponError('Network error creating coupon.')
		} finally {
			setCouponBusy(false)
		}
	}

	async function handleDeleteCoupon(id: string, code: string) {
		if (!window.confirm(`Are you sure you want to delete coupon '${code}'?`)) return
		try {
			const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' })
			if (res.ok) {
				setCoupons((prev) => prev.filter((c) => c.id !== id))
			} else {
				alert('Could not delete coupon.')
			}
		} catch {
			alert('Network error deleting coupon.')
		}
	}

	function generateRandomCode() {
		const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
		setNewCode(`SAYIT-${rand}`)
	}

	async function signOut() {
		await fetch('/api/admin/login', { method: 'DELETE' })
		window.location.reload()
	}

	return (
		<div className="page-shell">
			<div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 32 }}>
				<div>
					<h1 style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 800 }}>Admin <span className="hero-gradient">Dashboard</span></h1>
					<p className="meta-note" style={{ margin: 0 }}>Overview of sales, revenue, pixel management &amp; discount coupons.</p>
				</div>
				<button className="button button--sm" type="button" onClick={signOut}>
					Sign Out
				</button>
			</div>

			<div className="admin-grid" style={{ marginBottom: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
				<div className="panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
					<h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: 0, fontWeight: 600 }}>Total Sales</h2>
					<div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.sold} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>blocks</span></div>
				</div>
				<div className="panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
					<h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: 0, fontWeight: 600 }}>Total Revenue</h2>
					<div style={{ fontSize: '2.5rem', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{formatInr(totalRevenuePaise)}</div>
				</div>
				<div className="panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
					<h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: 0, fontWeight: 600 }}>Remaining Capacity</h2>
					<div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.remaining} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {stats.totalBlocks}</span></div>
				</div>
			</div>

			{/* Coupon Management Section */}
			<h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700 }}>Coupon System Management</h2>
			<div className="panel" style={{ marginBottom: 48, padding: '24px' }}>
				<form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
					<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Create New Coupon</h3>
					
					{couponError && (
						<div className="alert alert--error" style={{ padding: '8px 12px', fontSize: 14 }}>
							{couponError}
						</div>
					)}
					{couponSuccess && (
						<div className="alert alert--info" style={{ padding: '8px 12px', fontSize: 14, borderColor: 'var(--positive)', color: 'var(--positive)' }}>
							{couponSuccess}
						</div>
					)}

					{/* Coupon Type Selector */}
					<div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
						<button
							type="button"
							onClick={() => setNewCouponType('SINGLE_USE')}
							style={{
								flex: 1,
								padding: '12px 16px',
								borderRadius: 8,
								border: `2px solid ${newCouponType === 'SINGLE_USE' ? 'var(--accent)' : 'var(--border)'}`,
								background: newCouponType === 'SINGLE_USE' ? 'var(--accent-soft, rgba(39, 131, 222, 0.1))' : 'var(--surface-glass)',
								cursor: 'pointer',
								transition: 'all 0.2s ease',
							}}
						>
							<div style={{ fontSize: 14, fontWeight: 700, color: newCouponType === 'SINGLE_USE' ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2 }}>🔒 Single Use</div>
							<div style={{ fontSize: 12, color: 'var(--text-muted)' }}>One-time use, expires after redemption</div>
						</button>
						<button
							type="button"
							onClick={() => setNewCouponType('UNLIMITED')}
							style={{
								flex: 1,
								padding: '12px 16px',
								borderRadius: 8,
								border: `2px solid ${newCouponType === 'UNLIMITED' ? 'var(--accent)' : 'var(--border)'}`,
								background: newCouponType === 'UNLIMITED' ? 'var(--accent-soft, rgba(39, 131, 222, 0.1))' : 'var(--surface-glass)',
								cursor: 'pointer',
								transition: 'all 0.2s ease',
							}}
						>
							<div style={{ fontSize: 14, fontWeight: 700, color: newCouponType === 'UNLIMITED' ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2 }}>♾️ Unlimited Use</div>
							<div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Can be used by many users, shows social proof</div>
						</button>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
						<div className="field" style={{ margin: 0 }}>
							<label htmlFor="coupon-code" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Coupon Code</label>
							<div style={{ display: 'flex', gap: 8 }}>
								<input
									id="coupon-code"
									type="text"
									placeholder="e.g. DISCOUNT20"
									value={newCode}
									onChange={(e) => setNewCode(e.target.value.toUpperCase())}
									style={{ flex: 1, padding: '8px 12px', textTransform: 'uppercase', fontWeight: 700 }}
								/>
								<button
									className="button button--secondary"
									type="button"
									onClick={generateRandomCode}
									style={{ padding: '8px 12px', fontSize: 13 }}
									title="Generate random code"
								>
									Auto
								</button>
							</div>
						</div>

						<div className="field" style={{ margin: 0 }}>
							<label htmlFor="coupon-discount-type" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Discount Type</label>
							<select
								id="coupon-discount-type"
								value={newDiscountType}
								onChange={(e) => setNewDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
								style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-bright)', borderRadius: 6, color: 'var(--input-color)' }}
							>
								<option value="PERCENT">Percentage (%)</option>
								<option value="FIXED">Fixed Amount (₹)</option>
							</select>
						</div>

						<div className="field" style={{ margin: 0 }}>
							<label htmlFor="coupon-value" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>
								Discount Value ({newDiscountType === 'PERCENT' ? '%' : '₹'})
							</label>
							<input
								id="coupon-value"
								type="number"
								step="any"
								min="1"
								placeholder={newDiscountType === 'PERCENT' ? 'e.g. 20 (for 20%)' : 'e.g. 100 (for ₹100)'}
								value={newDiscountValue}
								onChange={(e) => setNewDiscountValue(e.target.value)}
								style={{ width: '100%', padding: '8px 12px' }}
							/>
						</div>

						<button
							className="button button--primary"
							type="submit"
							disabled={couponBusy}
							style={{ padding: '10px 20px', height: 42 }}
						>
							{couponBusy ? 'Creating...' : `Create ${newCouponType === 'UNLIMITED' ? 'Unlimited' : 'Single-Use'} Coupon`}
						</button>
					</div>
				</form>

				<h4 style={{ margin: '24px 0 12px', fontSize: 15, fontWeight: 600 }}>Existing Coupons ({coupons.length})</h4>
				<div style={{ overflowX: 'auto' }}>
					<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
						<thead>
							<tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-glass)' }}>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Code</th>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Type</th>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Discount</th>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Created</th>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Usage Details</th>
								<th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{(showAllCoupons ? coupons : coupons.slice(0, INITIAL_VISIBLE)).map((c) => (
								<tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
									<td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 15 }}>
										{c.code}
									</td>
									<td style={{ padding: '12px 16px' }}>
										<span style={{
											display: 'inline-block',
											padding: '2px 8px',
											borderRadius: 4,
											fontSize: 11,
											fontWeight: 700,
											letterSpacing: '0.03em',
											background: c.couponType === 'UNLIMITED'
												? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))'
												: 'var(--surface-glass)',
											color: c.couponType === 'UNLIMITED' ? '#8B5CF6' : 'var(--text-muted)',
											border: `1px solid ${c.couponType === 'UNLIMITED' ? 'rgba(139, 92, 246, 0.3)' : 'var(--border)'}`,
										}}>
											{c.couponType === 'UNLIMITED' ? '♾️ UNLIMITED' : '🔒 SINGLE'}
										</span>
									</td>
									<td style={{ padding: '12px 16px', color: 'var(--accent)', fontWeight: 600 }}>
										{c.discountType === 'PERCENT' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
									</td>
									<td style={{ padding: '12px 16px' }}>
										{c.couponType === 'UNLIMITED' ? (
											<span style={{
												display: 'inline-block',
												padding: '2px 8px',
												borderRadius: 4,
												fontSize: 12,
												fontWeight: 700,
												background: 'var(--positive-soft)',
												color: 'var(--positive)',
												border: '1px solid var(--positive)'
											}}>
												ACTIVE
											</span>
										) : c.isUsed ? (
											<span style={{
												display: 'inline-block',
												padding: '2px 8px',
												borderRadius: 4,
												fontSize: 12,
												fontWeight: 700,
												background: 'var(--error-soft)',
												color: 'var(--error)',
												border: '1px solid var(--error)'
											}}>
												USED
											</span>
										) : (
											<span style={{
												display: 'inline-block',
												padding: '2px 8px',
												borderRadius: 4,
												fontSize: 12,
												fontWeight: 700,
												background: 'var(--positive-soft)',
												color: 'var(--positive)',
												border: '1px solid var(--positive)'
											}}>
												ACTIVE
											</span>
										)}
									</td>
									<td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
										{new Date(c.createdAt).toLocaleDateString()}
									</td>
									<td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
										{c.couponType === 'UNLIMITED' ? (
											<div>
												<div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
													🔥 Used {c.usageCount} {c.usageCount === 1 ? 'time' : 'times'}
												</div>
												{c.creatorPin && (
													<div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
														<span style={{ fontSize: 11, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontFamily: 'monospace' }}>
															PIN: {c.creatorPin}
														</span>
														<button
															type="button"
															onClick={() => {
																const origin = window.location.origin
																const privateLink = `${origin}/creator/${c.code}?pin=${c.creatorPin}`
																void navigator.clipboard.writeText(privateLink)
																alert(`Copied Private Creator Link for ${c.code} to clipboard!\n${privateLink}`)
															}}
															style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}
															title="Copy direct secret link for this creator"
														>
															📋 Copy Partner Link
														</button>
													</div>
												)}
											</div>
										) : c.isUsed ? (
											<div>
												<div>Used by: <strong>{c.usedByEmail || 'Unknown'}</strong></div>
												{c.usedAt && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>On: {new Date(c.usedAt).toLocaleString()}</div>}
											</div>
										) : (
											<span style={{ color: 'var(--text-muted)' }}>—</span>
										)}
									</td>
									<td style={{ padding: '12px 16px', textAlign: 'right' }}>
										{/* Allow delete for unused single-use, or always for unlimited */}
										{(c.couponType === 'UNLIMITED' || !c.isUsed) && (
											<button
												className="button button--danger"
												type="button"
												style={{ padding: '4px 10px', fontSize: 12 }}
												onClick={() => handleDeleteCoupon(c.id, c.code)}
											>
												Delete
											</button>
										)}
									</td>
								</tr>
							))}
							{coupons.length === 0 && (
								<tr>
									<td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
										No coupons created yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<SeeMoreButton total={coupons.length} visible={INITIAL_VISIBLE} expanded={showAllCoupons} onToggle={() => setShowAllCoupons(!showAllCoupons)} />
			</div>

			<h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700 }}>Top Buyers</h2>
			<div className="panel" style={{ overflowX: 'auto', marginBottom: 48, padding: 0 }}>
				<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
					<thead>
						<tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-glass)' }}>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Name</th>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Blocks Bought</th>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Spent</th>
						</tr>
					</thead>
					<tbody>
						{(showAllBuyers ? topBuyers : topBuyers.slice(0, INITIAL_VISIBLE)).map((buyer) => (
							<tr key={buyer.email} style={{ borderBottom: '1px solid var(--border)' }}>
								<td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{buyer.name}</td>
								<td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{buyer.email}</td>
								<td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{buyer.blocksBought}</td>
								<td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--accent)' }}>{formatInr(buyer.totalAmountPaise)}</td>
							</tr>
						))}
						{topBuyers.length === 0 && (
							<tr>
								<td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No buyers yet.</td>
							</tr>
						)}
					</tbody>
				</table>
				<SeeMoreButton total={topBuyers.length} visible={INITIAL_VISIBLE} expanded={showAllBuyers} onToggle={() => setShowAllBuyers(!showAllBuyers)} />
			</div>

			{/* Contact Form Submissions Section */}
			<h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700 }}>Contact Messages Inbox ({contactMessages.length})</h2>
			<div className="panel" style={{ overflowX: 'auto', marginBottom: 48, padding: 0 }}>
				<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
					<thead>
						<tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-glass)' }}>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>From</th>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Subject</th>
							<th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Message</th>
						</tr>
					</thead>
					<tbody>
						{(showAllMessages ? contactMessages : contactMessages.slice(0, INITIAL_VISIBLE)).map((msg) => (
							<tr key={msg.id} style={{ borderBottom: '1px solid var(--border)' }}>
								<td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
									{new Date(msg.createdAt).toLocaleString()}
								</td>
								<td style={{ padding: '16px 20px', color: 'var(--text-primary)' }}>
									<div style={{ fontWeight: 700 }}>{msg.name}</div>
									<a href={`mailto:${msg.email}`} style={{ fontSize: 13, color: 'var(--accent)' }}>{msg.email}</a>
								</td>
								<td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
									{msg.subject}
								</td>
								<td style={{ padding: '16px 20px', color: 'var(--text-secondary)', maxWidth: 400, overflowWrap: 'anywhere' }}>
									{msg.message}
								</td>
							</tr>
						))}
						{contactMessages.length === 0 && (
							<tr>
								<td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
									No contact messages received yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
				<SeeMoreButton total={contactMessages.length} visible={INITIAL_VISIBLE} expanded={showAllMessages} onToggle={() => setShowAllMessages(!showAllMessages)} />
			</div>

			<h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700 }}>Purchase Records ({items.length})</h2>
			{error ? (
				<div className="alert alert--error" role="alert" style={{ marginBottom: 24 }}>
					{error}
				</div>
			) : null}

			{items.length === 0 ? (
				<div className="alert alert--info">No blocks have been sold yet.</div>
			) : (
			<>
				<div className="admin-grid">
					{(showAllPurchases ? items : items.slice(0, INITIAL_VISIBLE)).map((item) => (
						<div className="panel" key={item.id}>
							<div className="admin-card__image">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={item.imageUrl} alt={`Submission by ${item.buyerName}`} />
							</div>
							<dl className="kv">
								<dt>Name</dt>
								<dd>{item.buyerName}</dd>
								<dt>Email</dt>
								<dd>{item.buyerEmail}</dd>
								<dt>Link</dt>
								<dd>
									<a href={item.linkUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--accent-cyan)' }}>
										{item.linkUrl}
									</a>
								</dd>
								<dt>Caption</dt>
								<dd>{item.description || <span className="meta-note">(none)</span>}</dd>
								<dt>Area</dt>
								<dd>
									{item.width} x {item.height} at ({item.x}, {item.y}) - {item.blocks} blocks
								</dd>
								<dt>Paid</dt>
								<dd style={{ color: 'var(--positive)', fontWeight: 600 }}>{item.amountLabel}</dd>
								<dt>Date</dt>
								<dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
							</dl>

							<div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
								<div className="field">
									<label htmlFor={`reason-${item.id}`} style={{ fontSize: '13px', fontWeight: 600 }}>Takedown reason (refunds user)</label>
									<input
										id={`reason-${item.id}`}
										type="text"
										list="rejection-hints"
										placeholder="e.g. Inappropriate content"
										value={reasons[item.id] ?? ''}
										onChange={(event) =>
											setReasons((current) => ({ ...current, [item.id]: event.target.value }))
										}
										style={{ padding: '8px 12px' }}
									/>
								</div>
								<button
									className="button button--danger"
									style={{ width: '100%', marginTop: 8 }}
									type="button"
									disabled={busyId === item.id}
									onClick={() => reject(item.id)}
								>
									Delete &amp; Refund
								</button>
							</div>
						</div>
					))}
				</div>
				<SeeMoreButton total={items.length} visible={INITIAL_VISIBLE} expanded={showAllPurchases} onToggle={() => setShowAllPurchases(!showAllPurchases)} />
			</>
			)}

			<datalist id="rejection-hints">
				{REJECTION_HINTS.map((hint) => (
					<option key={hint} value={hint} />
				))}
			</datalist>
		</div>
	)
}
