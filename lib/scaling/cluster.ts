import Redis from 'ioredis-cluster'
import { PrismaClient } from '@prisma/client'
import { updateDatabaseConnections } from '../monitoring/metrics'

// Initialize Redis Cluster
export const redisCluster = new Redis({
  nodes: (process.env.REDIS_CLUSTER_NODES || '').split(','),
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: process.env.NODE_ENV === 'production'
  }
})

// Initialize Prisma with connection pool
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configure connection pool
  connection: {
    pool: {
      min: 2,
      max: 10
    }
  }
})

// Monitor database connections
setInterval(async () => {
  const metrics = await prisma.$metrics.json()
  const connections = metrics.pools.reduce((acc, pool) => acc + pool.active, 0)
  updateDatabaseConnections(connections)
}, 5000)

// Handle Redis Cluster events
redisCluster.on('error', (err) => {
  console.error('Redis Cluster Error:', err)
})

redisCluster.on('node:error', (err) => {
  console.error('Redis Node Error:', err)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    prisma.$disconnect(),
    redisCluster.disconnect()
  ])
})