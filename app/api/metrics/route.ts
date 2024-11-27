import { NextResponse } from 'next/server'
import { getMetrics } from '@/lib/monitoring/metrics'
import { validateApiKey } from '@/lib/api-auth'

export async function GET(req: Request) {
  // Validate API key for metrics access
  const apiKeyData = await validateApiKey(req)
  if (!apiKeyData || apiKeyData.tier !== 'enterprise') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const metrics = await getMetrics()
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    )
  }
}