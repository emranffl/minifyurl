import { redis } from "./redis"

interface RateLimitConfig {
  limit: number        // Maximum number of requests
  window: number      // Time window in seconds
  errorMessage?: string
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 100, window: 60 }
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${identifier}`
  const now = Math.floor(Date.now() / 1000)
  const clearBefore = now - config.window

  const multi = redis.multi()
  
  // Remove old entries
  multi.zremrangebyscore(key, 0, clearBefore)
  
  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`)
  
  // Count requests in window
  multi.zcard(key)
  
  // Set expiry on the set
  multi.expire(key, config.window)
  
  const [, , count] = await multi.exec()
  const requestCount = count?.[1] as number

  const remaining = Math.max(0, config.limit - requestCount)
  const reset = now + config.window

  return {
    success: requestCount <= config.limit,
    remaining,
    reset
  }
}