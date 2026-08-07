import { z } from 'zod'
import { GRID, UPLOADS } from './config'

/**
 * Obvious spam / malware / URL-shortener domains are rejected outright.
 * Extend this list as you moderate real submissions.
 */
export const BLOCKED_URL_PATTERNS: RegExp[] = [
	/(^|\.)bit\.ly$/i,
	/(^|\.)tinyurl\.com$/i,
	/(^|\.)t\.co$/i,
	/(^|\.)is\.gd$/i,
	/(^|\.)cutt\.ly$/i,
	/(^|\.)shorte\.st$/i,
	/(^|\.)adf\.ly$/i,
	/(^|\.)grabify\.link$/i,
	/(^|\.)iplogger\.(org|com)$/i,
	/(^|\.)free-?(money|robux|vbucks)/i,
	/(^|\.)phish/i,
	/(^|\.)(xn--)/i, // punycode homograph attempts
	/\.(zip|mov|exe|apk|scr)$/i, // executable-looking hostnames/paths
]

export const linkUrlSchema = z
	.string()
	.trim()
	.max(500, 'Link is too long.')
	.refine((value) => value === '' || /^https?:\/\//i.test(value), {
		message: 'Link must start with http:// or https://',
	})
	.refine(
		(value) => {
			if (value === '') return true
			try {
				const url = new URL(value)
				if (!['http:', 'https:'].includes(url.protocol)) return false
				if (!url.hostname.includes('.')) return false
				if (/^(localhost|127\.|10\.|192\.168\.|0\.)/i.test(url.hostname)) return false
				return !BLOCKED_URL_PATTERNS.some(
					(pattern) => pattern.test(url.hostname) || pattern.test(url.pathname),
				)
			} catch {
				return false
			}
		},
		{ message: 'That link is not allowed. Use your real website or social profile.' },
	)

export const selectionSchema = z
	.object({
		x: z.number().int().min(0).max(GRID.columns - 1),
		y: z.number().int().min(0).max(GRID.rows - 1),
		width: z.number().int().min(1).max(GRID.columns),
		height: z.number().int().min(1).max(GRID.rows),
	})
	.refine((s) => s.x + s.width <= GRID.columns && s.y + s.height <= GRID.rows, {
		message: 'Selection falls outside the wall.',
	})

export const buyerSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Name must be at least 2 characters.')
		.max(60, 'Name must be 60 characters or fewer.'),
	email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
	linkUrl: linkUrlSchema,
	description: z
		.string()
		.trim()
		.min(3, 'Add a short description.')
		.max(150, 'Description must be 150 characters or fewer.'),
	imageUrl: z.string().trim().url('Upload an image first.'),
	imageWidth: z.number().int().min(1),
	imageHeight: z.number().int().min(1),
	agreedToTerms: z.literal(true, {
		errorMap: () => ({ message: 'You must accept the Terms & Conditions.' }),
	}),
})

export const createOrderSchema = z.object({
	selection: selectionSchema,
	buyer: buyerSchema,
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const contactSchema = z.object({
	name: z.string().trim().min(2).max(60),
	email: z.string().trim().toLowerCase().email().max(200),
	subject: z.string().trim().min(2).max(120),
	message: z.string().trim().min(10).max(2000),
})

export function validateUploadFile(file: {
	type: string
	size: number
}): { ok: true } | { ok: false; error: string } {
	if (!UPLOADS.allowedMimeTypes.includes(file.type as (typeof UPLOADS.allowedMimeTypes)[number])) {
		return { ok: false, error: 'Only JPG, PNG, WebP and GIF images are allowed.' }
	}
	if (file.size > UPLOADS.maxBytes) {
		return {
			ok: false,
			error: `Image must be ${Math.round(UPLOADS.maxBytes / 1024 / 1024)} MB or smaller.`,
		}
	}
	return { ok: true }
}

/** Image must be at least as large as the purchased pixel area. */
export function meetsMinimumDimensions(
	image: { width: number; height: number },
	selection: { width: number; height: number },
): boolean {
	const requiredWidth = selection.width * GRID.blockPixelSize
	const requiredHeight = selection.height * GRID.blockPixelSize
	return image.width >= requiredWidth && image.height >= requiredHeight
}

export function flattenZodError(error: z.ZodError): Record<string, string> {
	const fieldErrors: Record<string, string> = {}
	for (const issue of error.issues) {
		const key = issue.path.join('.') || 'form'
		if (!fieldErrors[key]) fieldErrors[key] = issue.message
	}
	return fieldErrors
}
