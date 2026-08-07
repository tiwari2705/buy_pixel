/** @type {import('next').NextConfig} */
const supabaseHost = process.env.SUPABASE_URL
	? new URL(process.env.SUPABASE_URL).hostname
	: undefined

const nextConfig = {
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: '**.supabase.co' },
			{ protocol: 'https', hostname: '**.amazonaws.com' },
			...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
		],
	},
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
				],
			},
		]
	},
}

export default nextConfig
