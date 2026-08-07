import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendApprovalEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Publishes a reviewed block to the wall. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	if (!(await isAdminAuthenticated())) {
		return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
	}

	const block = await prisma.block.findUnique({ where: { id } })
	if (!block) {
		return NextResponse.json({ error: 'Block not found.' }, { status: 404 })
	}
	if (block.status === 'live') {
		return NextResponse.json({ ok: true, alreadyLive: true })
	}
	if (block.status !== 'pending_review') {
		return NextResponse.json(
			{ error: `Only blocks awaiting review can be approved (this one is ${block.status}).` },
			{ status: 409 },
		)
	}

	await prisma.block.update({
		where: { id: block.id },
		data: { status: 'live', approvedAt: new Date(), rejectionReason: null },
	})

	await sendApprovalEmail({
		buyerName: block.buyerName ?? '',
		buyerEmail: block.buyerEmail ?? '',
		orderId: block.orderId ?? block.id,
	})

	revalidatePath('/')
	revalidatePath('/admin')

	return NextResponse.json({ ok: true })
}
