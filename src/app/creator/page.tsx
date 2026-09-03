import type { Metadata } from 'next'
import { CreatorPortal } from '@/components/CreatorPortal'
import { SITE } from '@/lib/config'

export const metadata: Metadata = {
	title: `Creator Partner Portal - ${SITE.name}`,
	description: 'Track your creator promo code sales, redemptions, and 25% commission revenue share in real time.',
}

export default async function CreatorPage({
	searchParams,
}: {
	searchParams: Promise<{ code?: string; pin?: string }>
}) {
	const params = await searchParams
	return <CreatorPortal initialCode={params.code} initialPin={params.pin} />
}
