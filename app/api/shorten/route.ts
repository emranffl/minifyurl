import { NextResponse } from "next/server"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { add } from "date-fns"
import { customUrlSchema, validateCustomUrl, hasRepeatingChars, isSpamPattern } from "@/lib/url-validation"
import { cacheUrl } from "@/lib/redis"
import { generateUniqueShortUrl } from "@/lib/url-generator"
import { urlSchema, checkUrlSafety } from "@/lib/security"

const prisma = new PrismaClient()

const shortenSchema = z.object({
  url: urlSchema,
  customUrl: z.string().optional(),
  expiration: z.enum(["never", "1day", "7days", "30days", "1year"]),
})

function getExpirationDate(expiration: string) {
  if (expiration === "never") return null

  const durations = {
    "1day": { days: 1 },
    "7days": { days: 7 },
    "30days": { days: 30 },
    "1year": { years: 1 },
  }

  return add(new Date(), durations[expiration])
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, customUrl, expiration } = shortenSchema.parse(body)

    // Check URL safety
    const safetyCheck = await checkUrlSafety(url)
    if (!safetyCheck.safe) {
      return NextResponse.json(
        { message: safetyCheck.reason || "URL appears to be unsafe" },
        { status: 400 }
      )
    }

    let shortUrl: string

    if (customUrl) {
      // Additional custom URL validations
      if (hasRepeatingChars(customUrl)) {
        return NextResponse.json(
          { message: "Custom URL contains too many repeating characters" },
          { status: 400 }
        )
      }

      if (isSpamPattern(customUrl)) {
        return NextResponse.json(
          { message: "Custom URL matches common spam patterns" },
          { status: 400 }
        )
      }

      const validation = await validateCustomUrl(customUrl)
      if (!validation.isValid) {
        return NextResponse.json({
          message: validation.error || "Invalid custom URL",
          suggestions: validation.suggestions,
          isPremium: validation.isPremium
        }, { status: 400 })
      }

      if (validation.isPremium) {
        return NextResponse.json({
          message: "This is a premium URL that requires payment",
          isPremium: true
        }, { status: 402 }) // 402 Payment Required
      }

      shortUrl = customUrl.toLowerCase()
    } else {
      shortUrl = await generateUniqueShortUrl()
    }

    const expiresAt = getExpirationDate(expiration)

    const link = await prisma.shortLink.create({
      data: {
        longUrl: url,
        shortUrl,
        expiresAt,
      },
    })

    // Cache the new URL immediately
    await cacheUrl(shortUrl, url, expiresAt)

    return NextResponse.json({
      shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/${link.shortUrl}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json(
      { message: "Failed to create short URL" },
      { status: 500 }
    )
  }
}