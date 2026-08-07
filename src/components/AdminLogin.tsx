'use client'

import { useState } from 'react'

/** Email + password sign-in for the private moderation area. */
export function AdminLogin() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault()
		setError(null)
		setSubmitting(true)
		try {
			const response = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			})
			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { error?: string }
				setError(data.error ?? 'Could not sign in.')
				return
			}
			window.location.reload()
		} catch {
			setError('Network error. Please try again.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="page-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
			<div style={{ width: '100%', maxWidth: 440 }}>
				<div style={{ textAlign: 'center', marginBottom: 32 }}>
					<h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px' }}>
						Admin <span className="hero-gradient">Portal</span>
					</h1>
					<p className="meta-note" style={{ fontSize: 15 }}>
						Sign in to access analytics and control pixel records.
					</p>
				</div>
				<form className="panel" onSubmit={onSubmit}>
					{error ? (
						<div className="alert alert--error" role="alert">
							{error}
						</div>
					) : null}
					<div className="field">
						<label htmlFor="admin-email">Admin Email</label>
						<input
							id="admin-email"
							type="email"
							autoComplete="username"
							placeholder="admin@sayitlpu.online"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>
					<div className="field">
						<label htmlFor="admin-password">Password</label>
						<input
							id="admin-password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</div>
					<div className="form-actions">
						<button className="button button--primary" style={{ width: '100%' }} type="submit" disabled={submitting}>
							{submitting ? 'Authenticating...' : 'Sign In to Dashboard'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
