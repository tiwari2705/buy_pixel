/**
 * Central config. Every tunable number (grid size, price, limits) lives here and
 * is read from environment variables. Never hardcode the price inline anywhere.
 */

function num(value: string | undefined, fallback: number): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function str(value: string | undefined, fallback: string): string {
	return value && value.trim().length > 0 ? value.trim() : fallback
}

export const GRID = {
	columns: num(process.env.NEXT_PUBLIC_GRID_COLUMNS, 100),
	rows: num(process.env.NEXT_PUBLIC_GRID_ROWS, 100),
	blockPixelSize: num(process.env.NEXT_PUBLIC_BLOCK_PIXEL_SIZE, 10),
} as const

export const CANVAS_WIDTH = GRID.columns * GRID.blockPixelSize // 1000
export const CANVAS_HEIGHT = GRID.rows * GRID.blockPixelSize // 1000
export const TOTAL_BLOCKS = GRID.columns * GRID.rows // 10,000

export const PRICING = {
	pricePerBlockInr: num(process.env.NEXT_PUBLIC_PRICE_PER_BLOCK_INR, 10),
	currency: str(process.env.NEXT_PUBLIC_CURRENCY, 'INR'),
} as const

/** Razorpay works in the smallest currency unit (paise). */
export const pricePerBlockPaise = PRICING.pricePerBlockInr * 100

/** Server-side amount calculation. The browser never decides the amount. */
export function amountForBlocksPaise(blockCount: number): number {
	if (!Number.isInteger(blockCount) || blockCount < 1) {
		throw new Error('blockCount must be a positive integer')
	}
	return blockCount * pricePerBlockPaise
}

export function formatInr(paise: number): string {
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: PRICING.currency,
		maximumFractionDigits: 0,
	}).format(paise / 100)
}

export const UPLOADS = {
	maxBytes: num(process.env.MAX_UPLOAD_BYTES, 2 * 1024 * 1024),
	allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const

export const RESERVATION_MINUTES = num(process.env.RESERVATION_MINUTES, 15)

export const SITE = {
	name: str(process.env.NEXT_PUBLIC_SITE_NAME, 'sayitlpu.online'),
	url: str(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000'),
	contactEmail: str(process.env.NEXT_PUBLIC_CONTACT_EMAIL, ''),
	contactPhone: str(process.env.NEXT_PUBLIC_CONTACT_PHONE, ''),
	contactAddress: str(process.env.NEXT_PUBLIC_CONTACT_ADDRESS, ''),
	legalEntity: str(
		process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME,
		'',
	),
	gstin: str(process.env.NEXT_PUBLIC_GSTIN, ''),
	disclaimer:
		'sayitlpu.online is an independent student initiative and is not affiliated with, endorsed by, or connected to Lovely Professional University.',
} as const

export const RATE_LIMITS = {
	orders: { limit: 8, windowMs: 60_000 },
	uploads: { limit: 12, windowMs: 60_000 },
	contact: { limit: 5, windowMs: 60_000 },
	adminLogin: { limit: 10, windowMs: 300_000 },
} as const
