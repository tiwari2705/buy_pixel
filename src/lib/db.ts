import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
		// Add connection pool settings for Supabase
		datasources: {
			db: {
				url: process.env.DATABASE_URL,
			},
		},
	})

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma
}

/** Postgres unique-constraint violation code surfaced by Prisma. */
export const UNIQUE_VIOLATION = 'P2002'

export function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === UNIQUE_VIOLATION
	)
}
