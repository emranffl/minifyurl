import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { validateCustomUrl } from "@/lib/url-validation"

interface FormState {
  url: string
  customUrl: string
  expiration: string
}

interface ValidationState {
  isValid: boolean
  isPremium?: boolean
  error?: string
}

export function URLShortenerForm() {
  const [formState, setFormState] = useState<FormState>({
    url: "",
    customUrl: "",
    expiration: "never",
  })
  const [shortUrl, setShortUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customUrlValidation, setCustomUrlValidation] = useState<ValidationState>({ isValid: true })
  const [isLoading, setIsLoading] = useState(false)

  const handleCustomUrlChange = (value: string) => {
    setFormState((prev) => ({ ...prev, customUrl: value }))
    if (value) {
      const validation = validateCustomUrl(value)
      setCustomUrlValidation({
        isValid: validation.isValid,
        isPremium: validation.isPremium,
        error: 'error' in validation ? validation.error : undefined,
      })
    } else {
      setCustomUrlValidation({ isValid: true })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShortUrl(null)
    setIsLoading(true)

    try {
      if (formState.customUrl && !customUrlValidation.isValid) {
        throw new Error(customUrlValidation.error || "Invalid custom URL")
      }

      if (customUrlValidation.isPremium) {
        // In a real app, this would redirect to a payment flow
        throw new Error("This is a premium URL. Please upgrade to use branded URLs.")
      }

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formState.url,
          customUrl: formState.customUrl || undefined,
          expiration: formState.expiration,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to shorten URL")
      }

      const data = await res.json()
      setShortUrl(data.shortUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to shorten URL")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Enter your long URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com/very-long-url"
          value={formState.url}
          onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customUrl">Custom URL (optional)</Label>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">minifyurl.xyz/</span>
          <Input
            id="customUrl"
            placeholder="your-custom-url"
            value={formState.customUrl}
            onChange={(e) => handleCustomUrlChange(e.target.value)}
            className={
              formState.customUrl && !customUrlValidation.isValid
                ? "border-red-500"
                : customUrlValidation.isPremium
                ? "border-yellow-500"
                : undefined
            }
          />
        </div>
        {formState.customUrl && !customUrlValidation.isValid && (
          <p className="text-sm text-red-500">{customUrlValidation.error}</p>
        )}
        {customUrlValidation.isPremium && (
          <p className="text-sm text-yellow-600">
            This is a premium URL. Additional charges may apply.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiration">URL Expiration</Label>
        <Select
          value={formState.expiration}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, expiration: value }))}
        >
          <SelectTrigger id="expiration">
            <SelectValue placeholder="Select expiration time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="1day">24 Hours</SelectItem>
            <SelectItem value="7days">7 Days</SelectItem>
            <SelectItem value="30days">30 Days</SelectItem>
            <SelectItem value="1year">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Processing..." : "Shorten URL"}
      </Button>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {shortUrl && (
        <div className="p-4 bg-green-50 rounded-md space-y-2">
          <p className="text-sm font-medium text-green-800">URL shortened successfully!</p>
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-500 break-all"
          >
            {shortUrl}
          </a>
        </div>
      )}
    </form>
  )
}