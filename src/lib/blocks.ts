import { Prisma } from '@prisma/client'
import { GRID, RESERVATION_MINUTES, TOTAL_BLOCKS } from './config'
import { isUniqueViolation, prisma } from './db'
import { processAndUploadImage } from './storage'

export type Selection = { x: number; y: number; width: number; height: number }

export type LiveBlock = {
	id: string
	x: number
	y: number
	width: number
	height: number
	imageUrl: string
	linkUrl: string
	buyerName: string
	description: string
}

/** Buyer details stored temporarily in Payment.buyerData until payment succeeds. */
export type BuyerData = {
	buyerName: string
	buyerEmail: string
	linkUrl: string
	description: string
	imageUrl: string
	imageWidth: number
	imageHeight: number
	couponCode?: string
	imageData?: string
	mimeType?: string
}

export class BlocksTakenError extends Error {
	constructor() {
		super('Someone just took part of your selection. Please pick a different area.')
		this.name = 'BlocksTakenError'
	}
}

export function blockCount(selection: Selection): number {
	return selection.width * selection.height
}

export function cellsFor(selection: Selection): Array<{ x: number; y: number }> {
	const cells: Array<{ x: number; y: number }> = []
	for (let dy = 0; dy < selection.height; dy += 1) {
		for (let dx = 0; dx < selection.width; dx += 1) {
			cells.push({ x: selection.x + dx, y: selection.y + dy })
		}
	}
	return cells
}

export function isInsideGrid(selection: Selection): boolean {
	return (
		selection.x >= 0 &&
		selection.y >= 0 &&
		selection.width >= 1 &&
		selection.height >= 1 &&
		selection.x + selection.width <= GRID.columns &&
		selection.y + selection.height <= GRID.rows
	)
}

/** Deletes cells whose reservation expired, freeing them for new buyers. */
export async function releaseExpiredReservations(): Promise<number> {
	const expired = await prisma.block.findMany({
		where: { status: 'reserved', reservedUntil: { lt: new Date() } },
		select: { id: true },
	})
	if (expired.length === 0) return 0
	const ids = expired.map((block) => block.id)
	await prisma.$transaction([
		prisma.blockCell.deleteMany({ where: { blockId: { in: ids } } }),
		prisma.block.deleteMany({ where: { id: { in: ids }, status: 'reserved' } }),
	])
	return ids.length
}

export async function getLiveBlocks(): Promise<LiveBlock[]> {
	const blocks = await prisma.block.findMany({
		where: { status: 'live' },
		select: {
			id: true,
			x: true,
			y: true,
			width: true,
			height: true,
			imageUrl: true,
			linkUrl: true,
			buyerName: true,
			description: true,
		},
		orderBy: [{ y: 'asc' }, { x: 'asc' }],
	})
	// Coerce nullable fields for live blocks (they should always be populated
	// after payment, but TypeScript needs the guarantee).
	return blocks.map((b) => ({
		...b,
		imageUrl: b.imageUrl ?? '',
		linkUrl: b.linkUrl ?? '',
		buyerName: b.buyerName ?? '',
		description: b.description ?? '',
	}))
}

export type WallStats = {
	totalBlocks: number
	sold: number
	remaining: number
}

export async function getWallStats(): Promise<WallStats> {
	const sold = await prisma.blockCell.count({
		where: { block: { status: { in: ['live', 'pending_review'] } } },
	})
	return { totalBlocks: TOTAL_BLOCKS, sold, remaining: Math.max(0, TOTAL_BLOCKS - sold) }
}

/**
 * Occupied cells for the buy page. Reserved cells whose window expired are
 * treated as free. Returned as a compact list of rectangles + a flat cell list.
 */
export async function getOccupiedCells(): Promise<Array<{ x: number; y: number }>> {
	await releaseExpiredReservations()
	return prisma.blockCell.findMany({
		where: {
			block: {
				OR: [
					{ status: { in: ['live', 'pending_review'] } },
					{ status: 'reserved', reservedUntil: { gte: new Date() } },
				],
			},
		},
		select: { x: true, y: true },
	})
}

export type ReserveInput = {
	selection: Selection
}

/**
 * Creates a `reserved` block plus one block_cell row per 10x10 block inside a
 * single transaction. The UNIQUE (x, y) constraint on block_cells is what makes
 * double-selling impossible, even with two simultaneous buyers.
 *
 * NOTE: No buyer details are stored here. Only grid position and reservation
 * metadata. Buyer data is held in Payment.buyerData and written to the Block
 * only after successful payment (via markOrderPaid).
 */
export async function reserveBlocks(input: ReserveInput): Promise<{ blockId: string }> {
	// Note: releaseExpiredReservations() runs when the buy page loads
	// (via getOccupiedCells), so we skip it here to keep order creation fast.
	const cells = cellsFor(input.selection)
	const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)

	try {
		return await prisma.$transaction(async (tx) => {
			const block = await tx.block.create({
				data: {
					x: input.selection.x,
					y: input.selection.y,
					width: input.selection.width,
					height: input.selection.height,
					status: 'reserved',
					reservedUntil,
				},
			})

			// createMany fails atomically if ANY (x, y) already exists.
			await tx.blockCell.createMany({
				data: cells.map((cell) => ({ blockId: block.id, x: cell.x, y: cell.y })),
			})

			return { blockId: block.id }
		})
	} catch (error) {
		if (isUniqueViolation(error)) throw new BlocksTakenError()
		throw error
	}
}

/**
 * Idempotent: only a verified webhook may promote a block to pending_review.
 * This is where buyer data is finally written to the Block — only after
 * Razorpay confirms the payment was captured.
 */
export async function markOrderPaid(params: {
	razorpayOrderId: string
	razorpayPaymentId: string
	amountPaise: number
	currency: string
	rawPayload: Prisma.InputJsonValue
}): Promise<{ alreadyProcessed: boolean; blockId: string | null }> {
	const payment = await prisma.payment.findUnique({
		where: { razorpayOrderId: params.razorpayOrderId },
		include: { block: true },
	})

	if (!payment) return { alreadyProcessed: false, blockId: null }
	if (payment.status === 'captured') return { alreadyProcessed: true, blockId: payment.blockId }

	// Extract buyer data that was stored in Payment.buyerData at order creation
	const buyer = (payment.buyerData ?? {}) as Partial<BuyerData>

	let finalImageUrl = buyer.imageUrl ?? ''
	let finalImageWidth = buyer.imageWidth ?? 0
	let finalImageHeight = buyer.imageHeight ?? 0

	// Upload image to storage ONLY after payment is confirmed
	const imageSource = buyer.imageData || buyer.imageUrl
	if (imageSource && (imageSource.startsWith('data:') || buyer.imageData)) {
		try {
			const uploaded = await processAndUploadImage(imageSource, buyer.mimeType)
			finalImageUrl = uploaded.url
			if (uploaded.width) finalImageWidth = uploaded.width
			if (uploaded.height) finalImageHeight = uploaded.height
		} catch (uploadError) {
			console.error('[markOrderPaid] Image upload to storage failed:', uploadError)
		}
	}

	// Clean up temporary image data from buyerData so database stays lean
	const cleanedBuyerData = {
		...buyer,
		imageUrl: finalImageUrl,
		imageWidth: finalImageWidth,
		imageHeight: finalImageHeight,
	}
	delete (cleanedBuyerData as Record<string, unknown>).imageData

	const txs: Prisma.PrismaPromise<unknown>[] = [
		prisma.payment.update({
			where: { id: payment.id },
			data: {
				razorpayPaymentId: params.razorpayPaymentId,
				status: 'captured',
				amount: params.amountPaise,
				currency: params.currency,
				rawPayload: params.rawPayload,
				buyerData: cleanedBuyerData as unknown as Prisma.InputJsonValue,
			},
		}),
		prisma.block.update({
			where: { id: payment.blockId },
			data: {
				status: 'live',
				approvedAt: new Date(),
				reservedUntil: null, // blocks are now permanently assigned
				orderId: params.razorpayOrderId,
				// Buyer data is written to the block only now, after payment success
				buyerName: buyer.buyerName ?? '',
				buyerEmail: buyer.buyerEmail ?? '',
				linkUrl: buyer.linkUrl ?? '',
				description: buyer.description ?? '',
				imageUrl: finalImageUrl,
				imageWidth: finalImageWidth,
				imageHeight: finalImageHeight,
			},
		}),
	]

	if (buyer.couponCode) {
		const coupon = await prisma.coupon.findUnique({ where: { code: buyer.couponCode } })
		if (coupon) {
			if (coupon.couponType === 'SINGLE_USE') {
				// Mark single-use coupon as used
				txs.push(
					prisma.coupon.updateMany({
						where: { code: buyer.couponCode, isUsed: false },
						data: {
							isUsed: true,
							usedAt: new Date(),
							usedByEmail: buyer.buyerEmail ?? '',
							usedByBlockId: payment.blockId,
							usageCount: { increment: 1 },
						},
					}),
				)
			} else {
				// Unlimited coupon: increment counter + record redemption
				txs.push(
					prisma.coupon.update({
						where: { code: buyer.couponCode },
						data: { usageCount: { increment: 1 } },
					}),
					prisma.couponRedemption.create({
						data: {
							couponId: coupon.id,
							email: buyer.buyerEmail ?? '',
							blockId: payment.blockId,
						},
					}),
				)
			}
		}
	}

	await prisma.$transaction(txs)

	return { alreadyProcessed: false, blockId: payment.blockId }
}

/**
 * Completes an order when a 100% discount coupon makes the total amount ₹0.
 * Directly assigns the block to the buyer and handles the coupon based on its type.
 */
export async function completeFreeOrder(params: {
	blockId: string
	buyerData: BuyerData
	couponCode: string
}): Promise<void> {
	const coupon = await prisma.coupon.findUnique({ where: { code: params.couponCode } })

	let finalImageUrl = params.buyerData.imageUrl
	let finalImageWidth = params.buyerData.imageWidth
	let finalImageHeight = params.buyerData.imageHeight

	// Upload image to storage ONLY upon completing the order
	const imageSource = params.buyerData.imageData || params.buyerData.imageUrl
	if (imageSource && (imageSource.startsWith('data:') || params.buyerData.imageData)) {
		try {
			const uploaded = await processAndUploadImage(imageSource, params.buyerData.mimeType)
			finalImageUrl = uploaded.url
			if (uploaded.width) finalImageWidth = uploaded.width
			if (uploaded.height) finalImageHeight = uploaded.height
		} catch (uploadError) {
			console.error('[completeFreeOrder] Image upload to storage failed:', uploadError)
		}
	}

	const cleanedBuyerData = {
		...params.buyerData,
		imageUrl: finalImageUrl,
		imageWidth: finalImageWidth,
		imageHeight: finalImageHeight,
	}
	delete (cleanedBuyerData as Record<string, unknown>).imageData

	const txs: Prisma.PrismaPromise<unknown>[] = [
		prisma.block.update({
			where: { id: params.blockId },
			data: {
				status: 'live',
				approvedAt: new Date(),
				reservedUntil: null,
				buyerName: params.buyerData.buyerName,
				buyerEmail: params.buyerData.buyerEmail,
				linkUrl: params.buyerData.linkUrl,
				description: params.buyerData.description,
				imageUrl: finalImageUrl,
				imageWidth: finalImageWidth,
				imageHeight: finalImageHeight,
			},
		}),
		prisma.payment.create({
			data: {
				blockId: params.blockId,
				razorpayOrderId: `free_${params.blockId}_${Date.now()}`,
				razorpayPaymentId: `free_pay_${Date.now()}`,
				amount: 0,
				currency: 'INR',
				status: 'captured',
				buyerData: cleanedBuyerData as unknown as Prisma.InputJsonValue,
			},
		}),
	]

	if (coupon) {
		if (coupon.couponType === 'SINGLE_USE') {
			txs.push(
				prisma.coupon.updateMany({
					where: { code: params.couponCode, isUsed: false },
					data: {
						isUsed: true,
						usedAt: new Date(),
						usedByEmail: params.buyerData.buyerEmail,
						usedByBlockId: params.blockId,
						usageCount: { increment: 1 },
					},
				}),
			)
		} else {
			txs.push(
				prisma.coupon.update({
					where: { code: params.couponCode },
					data: { usageCount: { increment: 1 } },
				}),
				prisma.couponRedemption.create({
					data: {
						couponId: coupon.id,
						email: params.buyerData.buyerEmail,
						blockId: params.blockId,
					},
				}),
			)
		}
	}

	await prisma.$transaction(txs)
}

/**
 * When payment fails, mark it as failed AND delete the Block + BlockCells
 * so the grid cells are immediately freed for other buyers. No buyer data
 * was ever written to the Block (it only had grid coordinates).
 */
export async function markPaymentFailed(params: {
	razorpayOrderId: string
	rawPayload: Prisma.InputJsonValue
}) {
	const payment = await prisma.payment.findUnique({
		where: { razorpayOrderId: params.razorpayOrderId },
	})
	if (!payment || payment.status === 'captured') return

	// Delete the block + cells so the area is free again, then mark payment failed
	await prisma.$transaction([
		prisma.blockCell.deleteMany({ where: { blockId: payment.blockId } }),
		prisma.block.deleteMany({ where: { id: payment.blockId } }),
		prisma.payment.update({
			where: { id: payment.id },
			data: { status: 'failed', rawPayload: params.rawPayload },
		}),
	])
}
