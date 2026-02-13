/**
 * Global Database Connection Pool Manager
 * 
 * This module ensures we use a single Prisma instance across the entire application
 * and properly manage connections to prevent pool exhaustion.
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Use Next.js global to persist across hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Global singleton instance
let prismaInstance: PrismaClient | null = globalForPrisma.prisma || null

// Connection configuration
const CONNECTION_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_CONNECTION_LIMIT || '5'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_TIMEOUT || '20000'), 
  connectionTimeoutMillis: 20000,
}

/**
 * Get or create the global Prisma instance
 * This ensures we only have ONE Prisma client for the entire application
 */
export function getPrismaClient(): PrismaClient {
  // Return a dummy client on the client side to prevent errors
  if (typeof window !== 'undefined') {
    return {} as PrismaClient
  }
  
  if (!prismaInstance) {
    console.log('[DB] Initializing NEW Prisma instance with Adapter')
    
    // 1. Create a pg Pool
    const pool = new Pool(CONNECTION_CONFIG)
    
    // 2. Create the Prisma Adapter
    const adapter = new PrismaPg(pool)
    
    // 3. Create standard Prisma client with adapter
    prismaInstance = globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
      // errorFormat: 'minimal', 
    })

    // Track if we are already closing to avoid multiple end() calls
    let isClosing = false;

    // Handle process termination
    const cleanup = async () => {
      if (isClosing) return;
      isClosing = true;
      
      console.log('[DB] Closing connections...')
      try {
        await prismaInstance?.$disconnect()
        // The adapter might have its own cleanup, but pool.end() is the source of truth
        await pool.end() 
      } catch (err) {
        // Silently fail during exit if already closed
      } finally {
        prismaInstance = null
        globalForPrisma.prisma = undefined
      }
    }

    // Only add listeners once. SIGINT/SIGTERM are more reliable for explicit cleanup.
    // Avoid beforeExit in dev as it can trigger unexpectedly.
    if (process.listenerCount('SIGINT') === 0) {
      process.on('SIGINT', cleanup)  
    }
    if (process.listenerCount('SIGTERM') === 0) {
      process.on('SIGTERM', cleanup)
    }
  } else {
    // console.log('[DB] Reusing existing Prisma instance')
  }

  return prismaInstance
}

// Connection tracking (We lose granular tracking of pool with adapter unless using pool events)
const activeConnections = 0
const totalConnections = 0
const connectionErrors = 0

// Export a single shared instance
export const prisma = getPrismaClient()

// Connection health check utility
export async function checkDatabaseHealth(): Promise<boolean> {
  // Skip on client side
  if (typeof window !== 'undefined') {
    return false
  }
  
  try {
    // With adapter we can still use queryRaw
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Get connection stats (Mocked for now as we delegated to pg pool)
export function getConnectionStats() {
  return {
    active: activeConnections,
    total: totalConnections,
    errors: connectionErrors,
    configured: CONNECTION_CONFIG.max,
    errorRate: 'N/A' 
  }
}

// Middleware to wrap database operations with proper error handling
export async function withDatabase<T>(
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  // Throw error on client side
  if (typeof window !== 'undefined') {
    throw new Error('Database operations cannot be performed on the client side')
  }
  
  // activeConnections++ // Simplified tracking
  
  const startTime = Date.now()
  const maxRetries = 2
  let lastError: any
  
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation(prisma)
        return result
      } catch (error: any) {
        lastError = error
         // Track connection errors roughly
        
        // Don't retry on non-connection errors
        // (Simplified error checking)
        if (attempt === maxRetries) {
            throw error
        }

        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying...`)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
    }
    throw lastError
  } finally {
    // activeConnections--
    const duration = Date.now() - startTime
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow database operation (${duration}ms)`)
    }
  }
}

export type { PrismaClient }
