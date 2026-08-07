'use client'

import { useState } from 'react'

type Fields = Record<string, string>

export function ContactForm() {
	const [values, setValues] = useState({ name: '', email: '', subject: '', message: '' })
	const [errors, setErrors] = useState<Fields>({})
	const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
	const [message, setMessage] = useState('')

	function update(key: keyof typeof values, value: string) {
		setValues((current) => ({ ...current, [key]: value }))
		setErrors((current) => ({ ...current, [key]: '' }))
	}

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault()
		setStatus('sending')
		setMessage('')
		setErrors({})

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			})
			const data = (await response.json()) as { error?: string; fields?: Fields }

			if (!response.ok) {
				setErrors(data.fields ?? {})
				setStatus('error')
				setMessage(data.error ?? 'Could not send your message.')
				return
			}

			setStatus('sent')
			setMessage('Thanks — your message is on its way. We usually reply within one working day.')
			setValues({ name: '', email: '', subject: '', message: '' })
		} catch {
			setStatus('error')
			setMessage('Network error. Please try again, or email us directly.')
		}
	}

	return (
		<form className="panel" onSubmit={onSubmit} noValidate>
			{status === 'sent' && (
				<p className="alert alert--success" role="status">
					{message}
				</p>
			)}
			{status === 'error' && (
				<p className="alert alert--error" role="alert">
					{message}
				</p>
			)}

			<div className="field">
				<label htmlFor="contact-name">Your Name</label>
				<input
					id="contact-name"
					name="name"
					type="text"
					autoComplete="name"
					placeholder="Enter your name"
					required
					value={values.name}
					onChange={(event) => update('name', event.target.value)}
					aria-invalid={errors.name ? 'true' : undefined}
					aria-describedby={errors.name ? 'contact-name-error' : undefined}
				/>
				{errors.name && (
					<p className="field__error" id="contact-name-error">
						{errors.name}
					</p>
				)}
			</div>

			<div className="field">
				<label htmlFor="contact-email">Email Address</label>
				<input
					id="contact-email"
					name="email"
					type="email"
					autoComplete="email"
					placeholder="your.email@example.com"
					required
					value={values.email}
					onChange={(event) => update('email', event.target.value)}
					aria-invalid={errors.email ? 'true' : undefined}
					aria-describedby={errors.email ? 'contact-email-error' : undefined}
				/>
				{errors.email && (
					<p className="field__error" id="contact-email-error">
						{errors.email}
					</p>
				)}
			</div>

			<div className="field">
				<label htmlFor="contact-subject">Subject</label>
				<input
					id="contact-subject"
					name="subject"
					type="text"
					placeholder="What is your message regarding?"
					required
					value={values.subject}
					onChange={(event) => update('subject', event.target.value)}
					aria-invalid={errors.subject ? 'true' : undefined}
					aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
				/>
				{errors.subject && (
					<p className="field__error" id="contact-subject-error">
						{errors.subject}
					</p>
				)}
			</div>

			<div className="field">
				<label htmlFor="contact-message">Message</label>
				<textarea
					id="contact-message"
					name="message"
					rows={5}
					placeholder="Write your message here..."
					required
					maxLength={2000}
					value={values.message}
					onChange={(event) => update('message', event.target.value)}
					aria-invalid={errors.message ? 'true' : undefined}
					aria-describedby={errors.message ? 'contact-message-error' : undefined}
				/>
				{errors.message && (
					<p className="field__error" id="contact-message-error">
						{errors.message}
					</p>
				)}
			</div>

			<div className="form-actions">
				<button type="submit" className="button button--primary" style={{ width: '100%' }} disabled={status === 'sending'}>
					{status === 'sending' ? 'Sending Message...' : 'Send Message'}
				</button>
			</div>
		</form>
	)
}
