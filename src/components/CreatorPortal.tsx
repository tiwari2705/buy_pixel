'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SITE } from '@/lib/config'

type CreatorOrder = {
	id: string
	date: string
	blockArea: string
	blocksCount: number
	amountPaise: number
	commissionPaise: number
	isFree: boolean
}

type CreatorStats = {
	code: string
	discountType: string
	discountValue: number
	couponType: string
	commissionPercent: number
	totalRedemptions: number
	totalRevenuePaise: number
	creatorCommissionPaise: number
	totalBlocksSold: number
	orders: CreatorOrder[]
}

function rupees(paise: number): string {
	return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	} catch {
		return iso
	}
}

export function CreatorPortal({
	initialCode,
	initialPin,
}: {
	initialCode?: string
	initialPin?: string
}) {
	const [inputCode, setInputCode] = useState(initialCode ? initialCode.toUpperCase() : '')
	const [inputPin, setInputPin] = useState(initialPin ? initialPin.trim() : '')
	const [activeCode, setActiveCode] = useState(initialCode ? initialCode.toUpperCase() : '')
	const [activePin, setActivePin] = useState(initialPin ? initialPin.trim() : '')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [requiresPin, setRequiresPin] = useState(false)
	const [stats, setStats] = useState<CreatorStats | null>(null)

	const fetchStats = useCallback(async (codeToFetch: string, pinToFetch?: string) => {
		if (!codeToFetch.trim()) return
		setLoading(true)
		setError('')
		try {
			const pinParam = pinToFetch ? `&pin=${encodeURIComponent(pinToFetch.trim())}` : ''
			const res = await fetch(
				`/api/creator/stats?code=${encodeURIComponent(codeToFetch.trim().toUpperCase())}${pinParam}`,
				{ cache: 'no-store' },
			)
			const data = await res.json()

			if (res.status === 401 || data.requiresPin) {
				setRequiresPin(true)
				setActiveCode(codeToFetch.trim().toUpperCase())
				setError(data.error ?? 'Private Access PIN is required to view this creator dashboard.')
				setStats(null)
			} else if (!res.ok) {
				setError(data.error ?? 'Could not find that creator promo code.')
				setStats(null)
				setRequiresPin(false)
			} else {
				setStats(data as CreatorStats)
				setActiveCode(codeToFetch.trim().toUpperCase())
				setActivePin(pinToFetch ?? '')
				setRequiresPin(false)
				setError('')
			}
		} catch {
			setError('Network error. Please try again.')
			setStats(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (initialCode) {
			void fetchStats(initialCode, initialPin)
		}
	}, [initialCode, initialPin, fetchStats])

	function handleCodeSearch(e: React.FormEvent) {
		e.preventDefault()
		if (!inputCode.trim()) return
		void fetchStats(inputCode, inputPin)
	}

	function handleUnlockWithPin(e: React.FormEvent) {
		e.preventDefault()
		if (!inputPin.trim()) return
		void fetchStats(activeCode || inputCode, inputPin)
	}

	function resetToSearch() {
		setStats(null)
		setRequiresPin(false)
		setError('')
		setInputPin('')
		setActivePin('')
	}

	return (
		<div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 16px 64px' }}>
			{/* Header */}
			<div style={{ textAlign: 'center', marginBottom: '36px' }}>
				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						padding: '6px 14px',
						background: 'var(--accent-soft)',
						color: 'var(--accent)',
						borderRadius: '9999px',
						fontSize: '13px',
						fontWeight: 600,
						marginBottom: '12px',
					}}
				>
					<span>🔒</span>
					<span>Private Creator Partner Portal</span>
				</div>
				<h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
					Creator Revenue Dashboard
				</h1>
				<p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
					Track your promo code sales and your guaranteed{' '}
					<strong style={{ color: 'var(--positive)' }}>25% revenue share</strong> in real time. Your earnings are completely private.
				</p>
			</div>

			{/* Code Lookup Bar (Shown when no stats and not on PIN screen) */}
			{!stats && !requiresPin && (
				<div
					className="panel"
					style={{
						maxWidth: '620px',
						margin: '0 auto 36px',
						padding: '24px',
						borderRadius: 'var(--radius-lg, 16px)',
						boxShadow: 'var(--shadow-glass)',
					}}
				>
					<h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 14px', textAlign: 'center' }}>
						Access Your Creator Portal
					</h2>
					<form onSubmit={handleCodeSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
						<div>
							<label htmlFor="creator-code-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
								Your Promo Code
							</label>
							<input
								id="creator-code-input"
								type="text"
								placeholder="e.g. CREATOR30"
								value={inputCode}
								onChange={(e) => setInputCode(e.target.value.toUpperCase())}
								disabled={loading}
								required
								style={{
									width: '100%',
									padding: '12px 16px',
									textTransform: 'uppercase',
									fontSize: '15px',
									fontWeight: 600,
									letterSpacing: '0.05em',
									borderRadius: '8px',
									border: '1px solid var(--border)',
									background: 'var(--input-bg, #fff)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>

						<div>
							<label htmlFor="creator-pin-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
								Private Access PIN (Optional if using direct link)
							</label>
							<input
								id="creator-pin-input"
								type="password"
								placeholder="6-digit PIN"
								maxLength={10}
								value={inputPin}
								onChange={(e) => setInputPin(e.target.value.trim())}
								disabled={loading}
								style={{
									width: '100%',
									padding: '12px 16px',
									fontSize: '15px',
									letterSpacing: '0.1em',
									borderRadius: '8px',
									border: '1px solid var(--border)',
									background: 'var(--input-bg, #fff)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>

						<button
							type="submit"
							className="button button--primary"
							disabled={loading || !inputCode.trim()}
							style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 600, marginTop: '4px' }}
						>
							{loading ? 'Verifying...' : 'Unlock Revenue Dashboard'}
						</button>
					</form>

					{error && (
						<p className="alert alert--error" style={{ marginTop: '16px', marginBottom: 0 }}>
							{error}
						</p>
					)}
				</div>
			)}

			{/* PIN Unlock Card (Shown if code is known but PIN is missing or incorrect) */}
			{requiresPin && !stats && (
				<div
					className="panel"
					style={{
						maxWidth: '520px',
						margin: '0 auto 36px',
						padding: '32px 24px',
						borderRadius: 'var(--radius-lg, 16px)',
						textAlign: 'center',
						boxShadow: 'var(--shadow-glass)',
						border: '1px solid var(--border-bright, var(--border))',
					}}
				>
					<div
						style={{
							width: '54px',
							height: '54px',
							borderRadius: '50%',
							background: 'var(--accent-soft)',
							color: 'var(--accent)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '24px',
							margin: '0 auto 16px',
						}}
					>
						🔒
					</div>
					<h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>
						Private Creator Portal
					</h2>
					<p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
						Sales &amp; revenue for code <strong style={{ color: 'var(--accent)' }}>{activeCode}</strong> are private.
						Enter your 6-digit Secret PIN to view your earnings.
					</p>

					{error && (
						<p className="alert alert--error" style={{ marginBottom: '18px', textAlign: 'left' }}>
							{error}
						</p>
					)}

					<form onSubmit={handleUnlockWithPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
						<input
							type="password"
							placeholder="Enter 6-digit PIN"
							maxLength={10}
							value={inputPin}
							onChange={(e) => setInputPin(e.target.value.trim())}
							disabled={loading}
							autoFocus
							style={{
								padding: '14px 16px',
								textAlign: 'center',
								fontSize: '20px',
								fontWeight: 700,
								letterSpacing: '0.2em',
								borderRadius: '8px',
								border: '1px solid var(--border)',
								background: 'var(--input-bg, #fff)',
								color: 'var(--text-primary)',
							}}
						/>
						<button
							type="submit"
							className="button button--primary"
							disabled={loading || !inputPin.trim()}
							style={{ padding: '12px 20px', fontSize: '15px', fontWeight: 600 }}
						>
							{loading ? 'Unlocking...' : 'Unlock Dashboard'}
						</button>
					</form>

					<div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px' }}>
						<button
							type="button"
							onClick={resetToSearch}
							style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
						>
							Use a different code
						</button>
						<span style={{ color: 'var(--border)' }}>•</span>
						<Link href="/contact" style={{ color: 'var(--accent)' }}>
							Forgot your PIN?
						</Link>
					</div>
				</div>
			)}

			{/* Loaded Stats Dashboard (100% Private, Only visible after correct PIN) */}
			{stats && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
					{/* Partner Code Overview Banner */}
					<div
						className="panel"
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							flexWrap: 'wrap',
							gap: '20px',
							padding: '24px 28px',
							background: 'var(--surface-card)',
							borderRadius: 'var(--radius-lg, 16px)',
							border: '1px solid var(--border-bright, var(--border))',
						}}
					>
						<div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
								<span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--positive)', background: 'var(--positive-soft)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
									🔒 Verified Private Session
								</span>
								<button
									type="button"
									onClick={resetToSearch}
									style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
								>
									Lock / Switch Code
								</button>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<span
									style={{
										fontFamily: 'monospace',
										fontSize: '28px',
										fontWeight: 800,
										color: 'var(--accent)',
										letterSpacing: '0.05em',
									}}
								>
									{stats.code}
								</span>
								<span
									style={{
										padding: '4px 10px',
										background: 'var(--positive-soft)',
										color: 'var(--positive)',
										borderRadius: '6px',
										fontSize: '13px',
										fontWeight: 700,
									}}
								>
									{stats.commissionPercent}% Commission
								</span>
							</div>
							<p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
								Gives your buyers{' '}
								<strong>
									{stats.discountValue}
									{stats.discountType === 'PERCENT' ? '%' : '₹'} OFF
								</strong>{' '}
								on the wall, and earns you {stats.commissionPercent}% of every rupee paid.
							</p>
						</div>
					</div>

					{/* 4 Stats Cards Grid */}
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
							gap: '16px',
						}}
					>
						{/* Card 1: Creator Commission */}
						<div
							className="panel"
							style={{
								padding: '20px',
								borderRadius: 'var(--radius, 12px)',
								background: 'var(--surface-card)',
								border: '1px solid var(--border)',
								position: 'relative',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									right: 0,
									height: '4px',
									background: 'var(--positive)',
								}}
							/>
							<div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
								<span>Your {stats.commissionPercent}% Earnings</span>
								<span style={{ fontSize: '16px' }}>💸</span>
							</div>
							<div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--positive)' }}>
								{rupees(stats.creatorCommissionPaise)}
							</div>
							<div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
								Guaranteed net commission
							</div>
						</div>

						{/* Card 2: Total Sales */}
						<div
							className="panel"
							style={{
								padding: '20px',
								borderRadius: 'var(--radius, 12px)',
								background: 'var(--surface-card)',
								border: '1px solid var(--border)',
							}}
						>
							<div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
								<span>Total Revenue Generated</span>
								<span style={{ fontSize: '16px' }}>💰</span>
							</div>
							<div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
								{rupees(stats.totalRevenuePaise)}
							</div>
							<div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
								Across all completed orders
							</div>
						</div>

						{/* Card 3: Redemptions */}
						<div
							className="panel"
							style={{
								padding: '20px',
								borderRadius: 'var(--radius, 12px)',
								background: 'var(--surface-card)',
								border: '1px solid var(--border)',
							}}
						>
							<div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
								<span>Total Times Used</span>
								<span style={{ fontSize: '16px' }}>👥</span>
							</div>
							<div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
								{stats.totalRedemptions}
							</div>
							<div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
								Unique buyer orders
							</div>
						</div>

						{/* Card 4: Blocks Sold */}
						<div
							className="panel"
							style={{
								padding: '20px',
								borderRadius: 'var(--radius, 12px)',
								background: 'var(--surface-card)',
								border: '1px solid var(--border)',
							}}
						>
							<div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
								<span>Blocks Purchased</span>
								<span style={{ fontSize: '16px' }}>🧱</span>
							</div>
							<div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
								{stats.totalBlocksSold}
							</div>
							<div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
								Pixels live on the wall
							</div>
						</div>
					</div>

					{/* Order Activity Breakdown */}
					<div
						className="panel"
						style={{
							padding: '24px',
							borderRadius: 'var(--radius-lg, 16px)',
							background: 'var(--surface-card)',
							border: '1px solid var(--border)',
						}}
					>
						<h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span>📋</span>
							<span>Recent Order Activity</span>
						</h2>

						{stats.orders.length === 0 ? (
							<div
								style={{
									textAlign: 'center',
									padding: '40px 16px',
									background: 'var(--surface-sunken, #F9F8F7)',
									borderRadius: '8px',
									border: '1px dashed var(--border)',
								}}
							>
								<div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
								<h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>
									No redemptions yet!
								</h3>
								<p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
									Share your promo code <strong>{stats.code}</strong> with your audience. As soon as someone buys a block, it will appear here instantly.
								</p>
							</div>
						) : (
							<div style={{ overflowX: 'auto' }}>
								<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
									<thead>
										<tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
											<th style={{ padding: '10px 12px' }}>Date</th>
											<th style={{ padding: '10px 12px' }}>Area Purchased</th>
											<th style={{ padding: '10px 12px' }}>Order Total</th>
											<th style={{ padding: '10px 12px', color: 'var(--positive)' }}>Your {stats.commissionPercent}% Share</th>
											<th style={{ padding: '10px 12px' }}>Status</th>
										</tr>
									</thead>
									<tbody>
										{stats.orders.map((order) => (
											<tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
												<td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
													{formatDate(order.date)}
												</td>
												<td style={{ padding: '12px', fontWeight: 600 }}>
													{order.blockArea}
												</td>
												<td style={{ padding: '12px', fontWeight: 600 }}>
													{order.isFree ? (
														<span style={{ color: 'var(--positive)' }}>FREE (100% OFF)</span>
													) : (
														rupees(order.amountPaise)
													)}
												</td>
												<td style={{ padding: '12px', fontWeight: 700, color: 'var(--positive)' }}>
													{order.isFree ? '₹0' : rupees(order.commissionPaise)}
												</td>
												<td style={{ padding: '12px' }}>
													<span
														style={{
															display: 'inline-block',
															padding: '2px 8px',
															borderRadius: '4px',
															fontSize: '12px',
															fontWeight: 600,
															background: 'var(--positive-soft)',
															color: 'var(--positive)',
														}}
													>
														Captured &amp; Active
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Payout Information Card */}
					<div
						className="panel"
						style={{
							padding: '24px',
							borderRadius: 'var(--radius-lg, 16px)',
							background: 'var(--surface-sunken, rgba(0,0,0,0.02))',
							border: '1px solid var(--border)',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							flexWrap: 'wrap',
							gap: '16px',
						}}
					>
						<div>
							<h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>
								💳 How Payouts Work
							</h3>
							<p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '600px', lineHeight: 1.5 }}>
								Commissions are tallied weekly and paid directly to your registered UPI ID or Bank Account. Contact the team anytime to register your UPI ID or request instant settlement.
							</p>
						</div>
						<Link href="/contact" className="button button--secondary" style={{ whiteSpace: 'nowrap' }}>
							Contact for Payout
						</Link>
					</div>
				</div>
			)}
		</div>
	)
}
