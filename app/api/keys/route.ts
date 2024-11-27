import { NextResponse } from "next/server"
import { z } from "zod"
import { createApiKey, revokeApiKey } from "@/lib/api-auth"

const createKeySchema = z.object({
  userId: z.string(),
  tier: z.enum(["free", "premium", "enterprise"]),
  customQuota: z.number().optional()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, tier, customQuota } = createKeySchema.parse(body)
    
    const apiKey = await createApiKey(userId, tier, customQuota)
    
    return NextResponse.json({ apiKey })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { apiKey } = await req.json()
    
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }
    
    await revokeApiKey(apiKey)
    
    return NextResponse.json({ message: "API key revoked successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 })
  }
}