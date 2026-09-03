import crypto from 'node:crypto'
import sharp from 'sharp'

/**
 * Image upload & compression. Default implementation compresses images to
 * WebP / optimized format and uploads straight to Supabase Storage using
 * the service-role key from a server route.
 */

export type StoredImage = { url: string; path: string }

export type CompressedImageResult = {
	buffer: Buffer
	mimeType: string
	width: number
	height: number
	size: number
}

function extensionFor(mimeType: string): string {
	switch (mimeType) {
		case 'image/png':
			return 'png'
		case 'image/webp':
			return 'webp'
		case 'image/gif':
			return 'gif'
		default:
			return 'jpg'
	}
}

export function buildObjectPath(mimeType: string): string {
	const id = crypto.randomUUID()
	const datePrefix = new Date().toISOString().slice(0, 10)
	return `blocks/${datePrefix}/${id}.${extensionFor(mimeType)}`
}

/**
 * Extracts mime type and Buffer from a base64 data URI string.
 */
export function parseDataUri(dataUri: string): { mimeType: string; buffer: Buffer } | null {
	const match = dataUri.match(/^data:([^;]+);base64,(.*)$/)
	if (!match) return null
	const mimeType = match[1]
	const buffer = Buffer.from(match[2], 'base64')
	return { mimeType, buffer }
}

/**
 * Compresses an image buffer before uploading to storage.
 * - Auto-orients using EXIF metadata
 * - Downscales large images exceeding maxWidth/maxHeight while preserving aspect ratio
 * - Converts to optimized WebP (or preserves animated GIF)
 * - Strips unnecessary metadata to minimize byte size
 */
export async function compressImage(
	inputBuffer: Buffer,
	mimeType?: string,
	options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<CompressedImageResult> {
	const maxWidth = options?.maxWidth ?? 1200
	const maxHeight = options?.maxHeight ?? 1200
	const quality = options?.quality ?? 82

	try {
		const isGif =
			mimeType === 'image/gif' ||
			(inputBuffer.length > 3 && inputBuffer.toString('ascii', 0, 3) === 'GIF')

		if (isGif) {
			const meta = await sharp(inputBuffer, { animated: true }).metadata()
			const pages = meta.pages ?? 1
			if (pages > 1) {
				// Animated GIF - optimize while retaining frames
				const { data, info } = await sharp(inputBuffer, { animated: true })
					.resize({
						width: maxWidth,
						height: maxHeight,
						fit: 'inside',
						withoutEnlargement: true,
					})
					.gif()
					.toBuffer({ resolveWithObject: true })
				return {
					buffer: data,
					mimeType: 'image/gif',
					width: info.width,
					height: info.height,
					size: data.length,
				}
			}
		}

		// Standard image or single-frame GIF -> convert to high-efficiency WebP
		const { data, info } = await sharp(inputBuffer)
			.rotate() // auto-rotate based on EXIF
			.resize({
				width: maxWidth,
				height: maxHeight,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.webp({ quality, effort: 4 })
			.toBuffer({ resolveWithObject: true })

		return {
			buffer: data,
			mimeType: 'image/webp',
			width: info.width,
			height: info.height,
			size: data.length,
		}
	} catch (error) {
		console.error('[storage] Image compression failed, falling back to original bytes:', error)
		const fallbackDim = readImageDimensions(inputBuffer) ?? { width: 0, height: 0 }
		return {
			buffer: inputBuffer,
			mimeType: mimeType || 'image/jpeg',
			width: fallbackDim.width,
			height: fallbackDim.height,
			size: inputBuffer.length,
		}
	}
}

/**
 * Compresses an image given as a base64 data URI.
 */
export async function compressImageFromDataUri(
	dataUri: string,
	options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<CompressedImageResult & { dataUri: string }> {
	const parsed = parseDataUri(dataUri)
	if (!parsed) {
		throw new Error('Invalid image data URI.')
	}
	const compressed = await compressImage(parsed.buffer, parsed.mimeType, options)
	const compressedDataUri = `data:${compressed.mimeType};base64,${compressed.buffer.toString('base64')}`
	return {
		...compressed,
		dataUri: compressedDataUri,
	}
}

/**
 * Uploads an image to cloud storage (Supabase Storage / S3).
 * Always compresses the image before uploading to ensure minimal storage usage.
 */
export async function uploadImage(
	bytes: ArrayBuffer | Buffer,
	mimeType: string,
	options?: { skipCompression?: boolean; maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<StoredImage> {
	let uploadBuffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
	let uploadMime = mimeType

	// Compress before uploading to storage unless already compressed
	if (!options?.skipCompression) {
		const compressed = await compressImage(uploadBuffer, mimeType, options)
		uploadBuffer = compressed.buffer
		uploadMime = compressed.mimeType
	}

	const objectPath = buildObjectPath(uploadMime)
	const provider = process.env.STORAGE_PROVIDER ?? 'supabase'

	if (provider === 'supabase') {
		const baseUrl = process.env.SUPABASE_URL
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
		const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'pixel-uploads'
		if (!baseUrl || !serviceKey) throw new Error('Supabase storage env vars missing')

		const response = await fetch(
			`${baseUrl}/storage/v1/object/${bucket}/${objectPath}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${serviceKey}`,
					'Content-Type': uploadMime,
					'cache-control': 'public, max-age=31536000, immutable',
					'x-upsert': 'false',
				},
				body: new Uint8Array(uploadBuffer),
			},
		)

		if (!response.ok) {
			throw new Error(`Upload failed (${response.status}): ${await response.text()}`)
		}

		const publicBase =
			process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL ??
			`${baseUrl}/storage/v1/object/public/${bucket}`
		return { url: `${publicBase}/${objectPath}`, path: objectPath }
	}

	// --- S3-compatible fallback -------------------------------------------------
	// Install @aws-sdk/client-s3 and uncomment to use S3 / R2 / Spaces.
	//
	// const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
	// const s3 = new S3Client({
	//   region: process.env.S3_REGION!,
	//   endpoint: process.env.S3_ENDPOINT || undefined,
	//   credentials: {
	//     accessKeyId: process.env.S3_ACCESS_KEY_ID!,
	//     secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
	//   },
	// })
	// await s3.send(new PutObjectCommand({
	//   Bucket: process.env.S3_BUCKET!, Key: objectPath,
	//   Body: uploadBuffer, ContentType: uploadMime,
	//   CacheControl: 'public, max-age=31536000, immutable',
	// }))
	// return { url: `${process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL}/${objectPath}`, path: objectPath }

	throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`)
}

/**
 * Handles image upload only when payment is verified:
 * - If imageDataOrUrl is already a remote URL (http:// or https://), returns it directly without uploading again.
 * - If imageDataOrUrl is a data URI or base64, compresses it and uploads to storage.
 */
export async function processAndUploadImage(
	imageDataOrUrl: string,
	fallbackMime?: string,
): Promise<{ url: string; path: string; width: number; height: number }> {
	if (imageDataOrUrl.startsWith('http://') || imageDataOrUrl.startsWith('https://')) {
		return { url: imageDataOrUrl, path: '', width: 0, height: 0 }
	}

	const parsed = parseDataUri(imageDataOrUrl)
	const buffer = parsed ? parsed.buffer : Buffer.from(imageDataOrUrl, 'base64')
	const mime = parsed ? parsed.mimeType : (fallbackMime || 'image/webp')

	const compressed = await compressImage(buffer, mime)
	const uploaded = await uploadImage(compressed.buffer, compressed.mimeType, { skipCompression: true })

	return {
		url: uploaded.url,
		path: uploaded.path,
		width: compressed.width,
		height: compressed.height,
	}
}

/**
 * Reads intrinsic width/height from raw image bytes without any dependency.
 * Supports PNG, JPEG, GIF and WebP (VP8/VP8L/VP8X).
 */
export function readImageDimensions(
	buffer: Buffer,
): { width: number; height: number } | null {
	// PNG
	if (buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
		return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
	}
	// GIF
	if (buffer.length > 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
		return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
	}
	// WebP
	if (
		buffer.length > 30 &&
		buffer.toString('ascii', 0, 4) === 'RIFF' &&
		buffer.toString('ascii', 8, 12) === 'WEBP'
	) {
		const format = buffer.toString('ascii', 12, 16)
		if (format === 'VP8 ') {
			return {
				width: buffer.readUInt16LE(26) & 0x3fff,
				height: buffer.readUInt16LE(28) & 0x3fff,
			}
		}
		if (format === 'VP8L') {
			const bits = buffer.readUInt32LE(21)
			return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
		}
		if (format === 'VP8X') {
			const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16))
			const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16))
			return { width, height }
		}
	}
	// JPEG
	if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
		let offset = 2
		while (offset + 9 < buffer.length) {
			if (buffer[offset] !== 0xff) {
				offset += 1
				continue
			}
			const marker = buffer[offset + 1]
			const size = buffer.readUInt16BE(offset + 2)
			const isSof =
				(marker >= 0xc0 && marker <= 0xc3) ||
				(marker >= 0xc5 && marker <= 0xc7) ||
				(marker >= 0xc9 && marker <= 0xcb) ||
				(marker >= 0xcd && marker <= 0xcf)
			if (isSof) {
				return {
					height: buffer.readUInt16BE(offset + 5),
					width: buffer.readUInt16BE(offset + 7),
				}
			}
			offset += 2 + size
		}
	}
	return null
}
