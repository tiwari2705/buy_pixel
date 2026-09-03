import type { Metadata } from 'next'
import { AdminLogin } from '@/components/AdminLogin'
import { AdminDashboard, type LiveBlockData, type TopBuyer } from '@/components/AdminDashboard'
import { isAdminAuthenticated } from '@/lib/auth'
import { formatInr } from '@/lib/config'
import { prisma } from '@/lib/db'
import { getWallStats } from '@/lib/blocks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = {
	title: 'Admin Dashboard',
	robots: { index: false, follow: false },
}

export default async function AdminPage() {
	if (!(await isAdminAuthenticated())) {
		return <AdminLogin />
	}

	const [liveBlocks, stats, rawCoupons, rawMessages] = await Promise.all([
		prisma.block.findMany({
			where: { status: 'live' },
			orderBy: { createdAt: 'desc' },
			include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
		}),
		getWallStats(),
		prisma.coupon.findMany({
			orderBy: { createdAt: 'desc' },
		}),
		prisma.contactMessage.findMany({
			orderBy: { createdAt: 'desc' },
			take: 50,
		}),
	])

	let totalRevenuePaise = 0
	const buyerMap = new Map<string, TopBuyer>()

	const blocks: LiveBlockData[] = liveBlocks.map((block) => {
		const amountPaise = block.payments[0]?.amount ?? 0
		totalRevenuePaise += amountPaise

		const email = block.buyerEmail ?? ''
		const name = block.buyerName ?? ''
		const blocksBought = block.width * block.height

		if (email) {
			const existing = buyerMap.get(email)
			if (existing) {
				existing.totalAmountPaise += amountPaise
				existing.blocksBought += blocksBought
			} else {
				buyerMap.set(email, { email, name, totalAmountPaise: amountPaise, blocksBought })
			}
		}

		return {
			id: block.id,
			x: block.x,
			y: block.y,
			width: block.width,
			height: block.height,
			blocks: blocksBought,
			imageUrl: block.imageUrl ?? '',
			linkUrl: block.linkUrl ?? '',
			buyerName: name,
			buyerEmail: email,
			description: block.description ?? '',
			amountPaise,
			amountLabel: formatInr(amountPaise),
			createdAt: block.createdAt.toISOString(),
		}
	})

	const coupons = rawCoupons.map((c) => ({
		id: c.id,
		code: c.code,
		discountType: c.discountType,
		discountValue: c.discountValue,
		couponType: c.couponType,
		isUsed: c.isUsed,
		usedAt: c.usedAt ? c.usedAt.toISOString() : null,
		usedByEmail: c.usedByEmail,
		usageCount: c.usageCount,
		createdAt: c.createdAt.toISOString(),
	}))

	const contactMessages = rawMessages.map((m) => ({
		id: m.id,
		name: m.name,
		email: m.email,
		subject: m.subject,
		message: m.message,
		createdAt: m.createdAt.toISOString(),
	}))

	const topBuyers = Array.from(buyerMap.values()).sort((a, b) => b.totalAmountPaise - a.totalAmountPaise)

	return (
		<AdminDashboard 
			blocks={blocks} 
			stats={stats} 
			totalRevenuePaise={totalRevenuePaise} 
			topBuyers={topBuyers} 
			initialCoupons={coupons}
			contactMessages={contactMessages}
		/>
	)
}
