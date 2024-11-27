import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis = globalForRedis.redis || new Redis(process.env.REDIS_URL || '')

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// Cache TTL in seconds (24 hours)
export const CACHE_TTL = 24 * 60 * 60

// Cache keys
export const cacheKeys = {
  shortUrl: (shortUrl: string) => `url:${shortUrl}`,
  clicks: (shortUrl: string) => `clicks:${shortUrl}`,
}

// Cache a URL
export async function cacheUrl(shortUrl: string, longUrl: string, expiresAt: Date | null) {
  const key = cacheKeys.shortUrl(shortUrl)
  const value = JSON.stringify({ longUrl, expiresAt })
  await redis.setex(key, CACHE_TTL, value)
}

// Get a cached URL
export async function getCachedUrl(shortUrl: string) {
  const key = cacheKeys.shortUrl(shortUrl)
  const cached = await redis.get(key)
  if (!cached) return null
  return JSON.parse(cached) as { longUrl: string; expiresAt: string | null }
}

// Increment clicks with rate limiting
export async function incrementClicks(shortUrl: string) {
  const key = cacheKeys.clicks(shortUrl)
  const multi = redis.multi()
  
  // Increment clicks
  multi.incr(key)
  
  // Set expiration if not exists
  multi.expire(key, CACHE_TTL)
  
  const [clicks] = await multi.exec()
  return clicks?.[1] as number
}

// Get clicks count
export async function getClicksCount(shortUrl: string) {
  const key = cacheKeys.clicks(shortUrl)
  const clicks = await redis.get(key)
  return clicks ? parseInt(clicks, 10) : 0
}

// Clear cache for a URL
export async function clearUrlCache(shortUrl: string) {
  const urlKey = cacheKeys.shortUrl(shortUrl)
  const clicksKey = cacheKeys.clicks(shortUrl)
  await redis.del(urlKey, clicksKey)
}