import crypto from 'node:crypto'

/**
 * Image upload. Default implementation uploads straight to Supabase Storage
 * using the service-role key from a server route (the key never reaches the
 * browser). Swap in S3 by setting STORAGE_PROVIDER=s3 and filling the S3 vars.
 */

export type StoredImage = { url: string; path: string }

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

export async function uploadImage(
	bytes: ArrayBuffer,
	mimeType: string,
): Promise<StoredImage> {
	const objectPath = buildObjectPath(mimeType)
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
					'Content-Type': mimeType,
					'cache-control': 'public, max-age=31536000, immutable',
					'x-upsert': 'false',
				},
				body: Buffer.from(bytes),
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
	//   Body: Buffer.from(bytes), ContentType: mimeType,
	//   CacheControl: 'public, max-age=31536000, immutable',
	// }))
	// return { url: `${process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL}/${objectPath}`, path: objectPath }

	throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`)
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
