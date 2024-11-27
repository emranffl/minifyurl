import { NextRequest } from "next/server"
import { redis } from "./redis"

const API_KEY_PREFIX = "apikey:"
const API_KEY_TTL = 30 * 24 * 60 * 60 // 30 days

interface ApiKeyData {
  userId: string
  tier: "free" | "premium" | "enterprise"
  customQuota?: number
}

export async function validateApiKey(request: NextRequest): Promise<ApiKeyData | null> {
  const apiKey = request.headers.get("X-API-Key")
  
  if (!apiKey) {
    return null
  }

  const data = await redis.get(`${API_KEY_PREFIX}${apiKey}`)
  return data ? JSON.parse(data) : null
}

export async function createApiKey(userId: string, tier: ApiKeyData["tier"], customQuota?: number): Promise<string> {
  const apiKey = generateApiKey()
  const data: ApiKeyData = { userId, tier, customQuota }
  
  await redis.setex(
    `${API_KEY_PREFIX}${apiKey}`,
    API_KEY_TTL,
    JSON.stringify(data)
  )
  
  return apiKey
}

export async function revokeApiKey(apiKey: string): Promise<void> {
  await redis.del(`${API_KEY_PREFIX}${apiKey}`)
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const prefix = "mk_"
  let result = prefix
  
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}