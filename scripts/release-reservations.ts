/**
 * Release expired block reservations.
 *
 * Run manually with `npm run release`, or let the Vercel cron hit
 * /api/admin/reservations/release every 10 minutes. Both call the same
 * `releaseExpiredReservations()` helper so the behaviour is identical.
 */
import { releaseExpiredReservations } from '../src/lib/blocks'
import { prisma } from '../src/lib/db'

async function main() {
	const released = await releaseExpiredReservations()
	console.log(`Released ${released} expired reservation(s).`)
}

main()
	.catch((error) => {
		console.error('release-reservations failed:', error)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
