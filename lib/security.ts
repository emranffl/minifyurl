import { z } from 'zod'
import SafeBrowsing from 'google-safe-browsing'

const safeBrowsing = new SafeBrowsing(process.env.GOOGLE_SAFE_BROWSING_KEY || '')

// Known malicious patterns
const MALICIOUS_PATTERNS = [
  /phish(ing)?/i,
  /\.(ru|cn)\/login/i,
  /bank.*\.tk/i,
  /secure.*\.cf/i,
]

// URL validation schema
export const urlSchema = z.string().url().refine(
  (url) => {
    const urlObj = new URL(url)
    // Prevent localhost and internal IP addresses
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return false
    }
    // Check for private IP ranges
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipv4Pattern.test(urlObj.hostname)) {
      const parts = urlObj.hostname.split('.').map(Number)
      if (
        parts[0] === 10 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168)
      ) {
        return false
      }
    }
    return true
  },
  { message: 'Invalid or internal URL' }
)

export async function checkUrlSafety(url: string): Promise<{
  safe: boolean
  reason?: string
}> {
  try {
    // Check against malicious patterns
    if (MALICIOUS_PATTERNS.some(pattern => pattern.test(url))) {
      return { safe: false, reason: 'URL matches known malicious patterns' }
    }

    // Check with Google Safe Browsing API
    const threats = await safeBrowsing.checkSingle(url)
    
    if (threats && threats.length > 0) {
      return {
        safe: false,
        reason: `URL flagged as ${threats[0].threatType}`
      }
    }

    // Additional checks can be added here (e.g., domain age, SSL verification)

    return { safe: true }
  } catch (error) {
    console.error('Error checking URL safety:', error)
    // Fail closed - if we can't verify safety, assume it's unsafe
    return { 
      safe: false, 
      reason: 'Unable to verify URL safety'
    }
  }
}