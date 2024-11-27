import { customAlphabet } from 'nanoid'
import { redis } from './redis'

// Custom alphabet for URL-safe characters, excluding similar-looking characters
const SAFE_CHARS = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
const URL_LENGTH = 7

// Create a nanoid generator with our custom alphabet
const generateId = customAlphabet(SAFE_CHARS, URL_LENGTH)

export async function generateUniqueShortUrl(): Promise<string> {
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    const shortUrl = generateId()
    
    // Check Redis cache first
    const existsInCache = await redis.exists(`url:${shortUrl}`)
    if (existsInCache) {
      attempts++
      continue
    }

    // If not in cache, reserve it temporarily to prevent race conditions
    const reserved = await redis.set(
      `reserved:${shortUrl}`,
      '1',
      'NX',
      'EX',
      60 // Expire in 60 seconds if not used
    )

    if (reserved) {
      return shortUrl
    }

    attempts++
  }

  throw new Error('Failed to generate unique short URL')
}

export function isValidShortUrl(shortUrl: string): boolean {
  // Check length
  if (shortUrl.length !== URL_LENGTH) return false

  // Check characters
  const validChars = new Set(SAFE_CHARS)
  return [...shortUrl].every(char => validChars.has(char))
}