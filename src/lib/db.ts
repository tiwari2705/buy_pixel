import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
	})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
