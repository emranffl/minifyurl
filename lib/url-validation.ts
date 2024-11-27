import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { redis } from "./redis"

const prisma = new PrismaClient()

// List of reserved words that cannot be used as custom URLs
export const RESERVED_WORDS = [
  "admin", "api", "auth", "login", "logout", "signup", "register",
  "dashboard", "settings", "profile", "privacy", "terms", "help",
  "support", "about", "contact", "premium", "pricing", "static",
  "public", "assets", "images", "js", "css", "fonts", "docs",
  "blog", "status", "health", "metrics", "debug", "test"
]

// List of premium brand names that require payment
export const PREMIUM_BRANDS = [
  "apple", "google", "microsoft", "amazon", "facebook",
  "twitter", "instagram", "tiktok", "netflix", "spotify",
  "nike", "adidas", "samsung", "sony", "nintendo"
]

// Custom URL validation schema
export const customUrlSchema = z
  .string()
  .min(8, "Custom URL must be at least 8 characters")
  .max(32, "Custom URL cannot exceed 32 characters")
  .regex(
    /^[a-zA-Z0-9-_]+$/,
    "Custom URL can only contain letters, numbers, hyphens, and underscores"
  )
  .refine(
    (value) => !RESERVED_WORDS.includes(value.toLowerCase()),
    "This URL is reserved and cannot be used"
  )
  .transform((value) => value.toLowerCase())

// Check if a custom URL is premium
export function isPremiumUrl(url: string): boolean {
  return PREMIUM_BRANDS.some((brand) => url.toLowerCase().includes(brand))
}

interface ValidationResult {
  isValid: boolean
  isPremium?: boolean
  error?: string
  suggestions?: string[]
}

export async function validateCustomUrl(url: string): Promise<ValidationResult> {
  try {
    const validatedUrl = customUrlSchema.parse(url)
    const isPremium = isPremiumUrl(validatedUrl)

    // Check Redis cache first for faster response
    const existsInCache = await redis.exists(`url:${validatedUrl}`)
    if (existsInCache) {
      return {
        isValid: false,
        error: "This custom URL is already taken",
        suggestions: await generateSuggestions(validatedUrl)
      }
    }

    // Check database
    const existing = await prisma.shortLink.findUnique({
      where: { shortUrl: validatedUrl }
    })

    if (existing) {
      return {
        isValid: false,
        error: "This custom URL is already taken",
        suggestions: await generateSuggestions(validatedUrl)
      }
    }

    return { isValid: true, isPremium }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message }
    }
    return { isValid: false, error: "Invalid URL" }
  }
}

async function generateSuggestions(baseUrl: string): Promise<string[]> {
  const suggestions: string[] = []
  const suffixes = [
    "-2", "-3", "-custom",
    new Date().getFullYear().toString(),
    Math.random().toString(36).substring(2, 5)
  ]

  // Generate variations of the base URL
  for (const suffix of suffixes) {
    const suggestion = `${baseUrl}${suffix}`
    
    // Validate length
    if (suggestion.length > 32) continue

    // Check availability in both cache and database
    const existsInCache = await redis.exists(`url:${suggestion}`)
    if (existsInCache) continue

    const existing = await prisma.shortLink.findUnique({
      where: { shortUrl: suggestion }
    })

    if (!existing) {
      suggestions.push(suggestion)
    }

    // Stop if we have enough suggestions
    if (suggestions.length >= 3) break
  }

  return suggestions
}

// Additional validation for sequential characters
export function hasRepeatingChars(url: string): boolean {
  return /(.)\1{3,}/.test(url) // Checks for 4 or more repeating characters
}

// Check for common patterns that might indicate spam
export function isSpamPattern(url: string): boolean {
  const spamPatterns = [
    /^\d+$/, // All numbers
    /^[a-z]+\d{4,}$/, // Letters followed by 4+ numbers
    /test\d*$/i, // Ends with 'test' and optional numbers
  ]
  return spamPatterns.some(pattern => pattern.test(url))
}