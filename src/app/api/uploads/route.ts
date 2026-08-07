import { NextResponse } from 'next/server'
import { GRID, RATE_LIMITS, UPLOADS } from '@/lib/config'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { readImageDimensions, uploadImage } from '@/lib/storage'
import { validateUploadFile } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Direct image upload. The file type is checked against the allow-list and its
 * real pixel dimensions are read from the bytes, so a too-small image is caught
 * before the buyer reaches payment. Size is capped at UPLOADS.maxBytes.
 */
export async function POST(request: Request) {
	const limit = rateLimit(`uploads:${clientIp(request.headers)}`, RATE_LIMITS.uploads)
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many uploads. Please wait a moment and try again.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
		)
	}

	let formData: FormData
	try {
		formData = await request.formData()
	} catch {
		return NextResponse.json({ error: 'Could not read the uploaded file.' }, { status: 400 })
	}

	const file = formData.get('file')
	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
	}

	const check = validateUploadFile({ type: file.type, size: file.size })
	if (!check.ok) {
		return NextResponse.json({ error: check.error }, { status: 400 })
	}

	const arrayBuffer = await file.arrayBuffer()
	if (arrayBuffer.byteLength > UPLOADS.maxBytes) {
		return NextResponse.json(
			{ error: `Image must be ${Math.round(UPLOADS.maxBytes / 1024 / 1024)} MB or smaller.` },
			{ status: 400 },
		)
	}

	const dimensions = readImageDimensions(Buffer.from(arrayBuffer))
	if (!dimensions) {
		return NextResponse.json(
			{ error: 'That file is not a valid JPG, PNG, WebP or GIF image.' },
			{ status: 400 },
		)
	}

	// Optional selection size check, so buyers find out about a too-small image
	// before they reach the payment step.
	const width = Number(formData.get('selectionWidth'))
	const height = Number(formData.get('selectionHeight'))
	if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
		const neededW = width * GRID.blockPixelSize
		const neededH = height * GRID.blockPixelSize
		if (dimensions.width < neededW || dimensions.height < neededH) {
			return NextResponse.json(
				{
					error: `Image is ${dimensions.width} x ${dimensions.height}px. For this selection it must be at least ${neededW} x ${neededH}px.`,
				},
				{ status: 400 },
			)
		}
	}

	try {
		const uploaded = await uploadImage(arrayBuffer, file.type)
		return NextResponse.json({
			imageUrl: uploaded.url,
			path: uploaded.path,
			imageWidth: dimensions.width,
			imageHeight: dimensions.height,
		})
	} catch (error) {
		console.error('[uploads] failed', error)
		return NextResponse.json(
			{ error: 'Upload failed. Please try again in a moment.' },
			{ status: 500 },
		)
	}
}
