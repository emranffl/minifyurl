import { NextResponse } from "next/server"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { add } from "date-fns"
import { cacheUrl } from "@/lib/redis"

const prisma = new PrismaClient()

const bulkShortenSchema = z.object({
  urls: z.array(z.object({
    url: z.string().url(),
    expiration: z.enum(["never", "1day", "7days", "30days", "1year"]).optional().default("never")
  })).max(250)
})

function generateShortUrl() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

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
    const { urls } = bulkShortenSchema.parse(body)

    const results = await prisma.$transaction(
      urls.map(({ url, expiration }) => {
        const shortUrl = generateShortUrl()
        const expiresAt = getExpirationDate(expiration)

        return prisma.shortLink.create({
          data: {
            longUrl: url,
            shortUrl,
            expiresAt,
          },
        })
      })
    )

    // Cache all URLs in parallel
    await Promise.all(
      results.map(link => 
        cacheUrl(link.shortUrl, link.longUrl, link.expiresAt)
      )
    )

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    return NextResponse.json({
      urls: results.map(link => ({
        originalUrl: link.longUrl,
        shortUrl: `${baseUrl}/${link.shortUrl}`,
        expiresAt: link.expiresAt,
      }))
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: "Invalid input. Maximum 250 URLs allowed and all URLs must be valid.",
        errors: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json(
      { message: "Failed to create short URLs" },
      { status: 500 }
    )
  }
}