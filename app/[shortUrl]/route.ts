import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getCachedUrl, cacheUrl, incrementClicks } from "@/lib/redis"

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: { shortUrl: string } }
) {
  try {
    // Try to get the URL from cache first
    const cached = await getCachedUrl(params.shortUrl)

    if (cached) {
      // Check if the cached URL has expired
      if (cached.expiresAt && new Date() > new Date(cached.expiresAt)) {
        return NextResponse.redirect("/expired")
      }

      // Increment clicks asynchronously
      incrementClicks(params.shortUrl).catch(console.error)

      return NextResponse.redirect(cached.longUrl)
    }

    // If not in cache, get from database
    const link = await prisma.shortLink.findUnique({
      where: { shortUrl: params.shortUrl },
    })

    if (!link) {
      return NextResponse.redirect("/404")
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.redirect("/expired")
    }

    // Cache the URL for future requests
    await cacheUrl(params.shortUrl, link.longUrl, link.expiresAt)

    // Update clicks and last access in database
    prisma.shortLink.update({
      where: { id: link.id },
      data: {
        clicks: { increment: 1 },
        lastAccess: new Date(),
      },
    }).catch(console.error) // Don't await this update

    return NextResponse.redirect(link.longUrl)
  } catch (error) {
    console.error('Error processing short URL:', error)
    return NextResponse.redirect("/error")
  }
}