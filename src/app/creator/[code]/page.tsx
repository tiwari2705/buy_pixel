import type { Metadata } from 'next'
import { CreatorPortal } from '@/components/CreatorPortal'
import { SITE } from '@/lib/config'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ code: string }>
}): Promise<Metadata> {
	const { code } = await params
	const upper = (code ?? '').toUpperCase()
	return {
		title: `${upper} Creator Dashboard - ${SITE.name}`,
		description: `Live sales and 25% commission statistics for promo code ${upper}.`,
	}
}

export default async function CreatorCodePage({
	params,
	searchParams,
}: {
	params: Promise<{ code: string }>
	searchParams: Promise<{ pin?: string }>
}) {
	const { code } = await params
	const { pin } = await searchParams
	return <CreatorPortal initialCode={code} initialPin={pin} />
}
