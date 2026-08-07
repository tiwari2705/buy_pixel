/**
 * Seeds ~20 sample live blocks so the wall does not look empty in development.
 * Run with: npm run seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Seed = {
	x: number
	y: number
	width: number
	height: number
	name: string
	description: string
	link: string
	color: string
}

const PALETTE = [
	'2783DE',
	'46A171',
	'E56458',
	'F2C94C',
	'9B51E0',
	'2C2C2B',
	'7D7A75',
	'12A5A5',
]

function placeholderImage(seed: Seed, index: number): string {
	const color = PALETTE[index % PALETTE.length]
	const w = seed.width * 10
	const h = seed.height * 10
	const label = encodeURIComponent(seed.name.split(' ')[0])
	// Deterministic offline-friendly placeholder service
	const base = 'https://placehold.co/'
	return base + w + 'x' + h + '/' + color + '/FFFFFF/png?text=' + label
}

const SEEDS: Seed[] = [
	{ x: 2, y: 2, width: 12, height: 8, name: 'LPU Coders Club', description: 'Weekly DSA + web dev jams for LPU students.', link: 'https://example.com/lpu-coders', color: '' },
	{ x: 16, y: 2, width: 10, height: 6, name: 'Hostel Eats', description: 'Late night momos delivered to Boys Hostel 4.', link: 'https://example.com/hostel-eats', color: '' },
	{ x: 28, y: 2, width: 8, height: 8, name: 'Aarav Photography', description: 'Convocation and portfolio shoots on campus.', link: 'https://example.com/aarav-photo', color: '' },
	{ x: 38, y: 2, width: 14, height: 5, name: 'Notes Bazaar', description: 'Shared semester notes for CSE and ECE.', link: 'https://example.com/notes-bazaar', color: '' },
	{ x: 54, y: 2, width: 9, height: 9, name: 'Cycle Rentals LPU', description: 'Rent a cycle by the week inside campus.', link: 'https://example.com/cycles', color: '' },
	{ x: 65, y: 2, width: 12, height: 6, name: 'Startup Cell', description: 'Student founders meetup every Saturday.', link: 'https://example.com/startup-cell', color: '' },
	{ x: 79, y: 2, width: 10, height: 10, name: 'Design Guild', description: 'Figma workshops and free portfolio reviews.', link: 'https://example.com/design-guild', color: '' },
	{ x: 2, y: 12, width: 8, height: 12, name: 'Music Society', description: 'Open mic nights at Block 34 amphitheatre.', link: 'https://example.com/music', color: '' },
	{ x: 12, y: 12, width: 16, height: 7, name: 'Print & Bind Corner', description: 'Cheap thesis printing near Unimall.', link: 'https://example.com/print', color: '' },
	{ x: 30, y: 12, width: 11, height: 9, name: 'Fit@LPU', description: 'Student-run gym buddy and diet plans.', link: 'https://example.com/fit', color: '' },
	{ x: 43, y: 9, width: 10, height: 10, name: 'Robotics Team', description: 'Building autonomous rovers, join us.', link: 'https://example.com/robotics', color: '' },
	{ x: 55, y: 13, width: 13, height: 6, name: 'Second Hand Books', description: 'Buy and sell used textbooks safely.', link: 'https://example.com/books', color: '' },
	{ x: 70, y: 14, width: 9, height: 8, name: 'Travel Buddies', description: 'Shared cabs to Jalandhar and Amritsar.', link: 'https://example.com/travel', color: '' },
	{ x: 81, y: 14, width: 12, height: 5, name: 'Anime Club', description: 'Friday screenings and cosplay meets.', link: 'https://example.com/anime', color: '' },
	{ x: 3, y: 26, width: 14, height: 10, name: 'Freelance Devs', description: 'Student devs building sites for local shops.', link: 'https://example.com/freelance', color: '' },
	{ x: 20, y: 22, width: 8, height: 6, name: 'Chai Point 32', description: 'Best kulhad chai between Block 32 and 34.', link: 'https://example.com/chai', color: '' },
	{ x: 33, y: 24, width: 12, height: 8, name: 'Placement Prep', description: 'Mock interviews with final-year seniors.', link: 'https://example.com/placement', color: '' },
	{ x: 47, y: 22, width: 10, height: 7, name: 'Dance Crew LPU', description: 'Hip hop batches every evening at 7pm.', link: 'https://example.com/dance', color: '' },
	{ x: 60, y: 24, width: 11, height: 9, name: 'Green Campus', description: 'Plastic-free campus drive volunteers.', link: 'https://example.com/green', color: '' },
	{ x: 74, y: 25, width: 13, height: 7, name: 'Gamers Hub', description: 'Valorant and BGMI campus tournaments.', link: 'https://example.com/gamers', color: '' },
]

async function main() {
	console.log('Clearing existing seed data...')
	await prisma.click.deleteMany({})
	await prisma.payment.deleteMany({})
	await prisma.blockCell.deleteMany({})
	await prisma.block.deleteMany({})

	console.log(`Seeding ${SEEDS.length} sample blocks...`)
	let index = 0
	for (const seed of SEEDS) {
		const imageUrl = placeholderImage(seed, index)
		const orderId = `order_seed_${index.toString().padStart(3, '0')}`
		const amount = seed.width * seed.height * Number(process.env.NEXT_PUBLIC_PRICE_PER_BLOCK_INR ?? 10) * 100

		const block = await prisma.block.create({
			data: {
				orderId,
				x: seed.x,
				y: seed.y,
				width: seed.width,
				height: seed.height,
				buyerName: seed.name,
				buyerEmail: `sample${index}@example.com`,
				linkUrl: seed.link,
				description: seed.description,
				imageUrl,
				imageWidth: seed.width * 10,
				imageHeight: seed.height * 10,
				// leave the last two pending so /admin has something to moderate
				status: index >= SEEDS.length - 2 ? 'pending_review' : 'live',
				approvedAt: index >= SEEDS.length - 2 ? null : new Date(),
			},
		})

		const cells: Array<{ blockId: string; x: number; y: number }> = []
		for (let dy = 0; dy < seed.height; dy += 1) {
			for (let dx = 0; dx < seed.width; dx += 1) {
				cells.push({ blockId: block.id, x: seed.x + dx, y: seed.y + dy })
			}
		}
		await prisma.blockCell.createMany({ data: cells })

		await prisma.payment.create({
			data: {
				blockId: block.id,
				razorpayOrderId: orderId,
				razorpayPaymentId: `pay_seed_${index.toString().padStart(3, '0')}`,
				amount,
				currency: 'INR',
				status: 'captured',
			},
		})

		index += 1
	}

	const cellCount = await prisma.blockCell.count()
	console.log(`Done. ${index} blocks, ${cellCount} of 10000 cells occupied.`)
}

main()
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
