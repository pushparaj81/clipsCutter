import { prisma as pooledPrisma, withDatabase, checkDatabaseHealth } from './db/connection-pool'

// Export the same instance for both prisma and authPrisma
// This ensures we only use ONE connection pool
export const prisma = pooledPrisma
export const authPrisma = pooledPrisma

// Re-export utilities
export { withDatabase, checkDatabaseHealth }

// Re-export types and utilities
export type { PrismaClient } from '@prisma/client'
export { Prisma } from '@prisma/client'
