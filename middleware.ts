import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

const RATE_LIMIT_CONFIG = {
  // Different limits for different endpoints
  api: { limit: 100, window: 60 },    // 100 requests per minute for API
  redirect: { limit: 1000, window: 60 } // 1000 redirects per minute
}

export async function middleware(request: NextRequest) {
  const ip = request.ip || "127.0.0.1"
  const path = request.nextUrl.pathname

  // Skip rate limiting for non-API routes that aren't URL redirects
  if (!path.startsWith("/api") && !path.match(/^\/[a-zA-Z0-9-_]{6}$/)) {
    return NextResponse.next()
  }

  // Determine rate limit config based on route
  const config = path.startsWith("/api") 
    ? RATE_LIMIT_CONFIG.api 
    : RATE_LIMIT_CONFIG.redirect

  const result = await rateLimit(`${ip}:${path.split("/")[1]}`, config)

  if (!result.success) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests",
        message: `Please try again in ${Math.ceil((result.reset - Date.now() / 1000))} seconds`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": config.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
        },
      }
    )
  }

  const response = NextResponse.next()

  // Add rate limit headers to response
  response.headers.set("X-RateLimit-Limit", config.limit.toString())
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
  response.headers.set("X-RateLimit-Reset", result.reset.toString())

  return response
}