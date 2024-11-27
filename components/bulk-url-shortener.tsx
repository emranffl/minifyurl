import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface BulkResult {
  originalUrl: string
  shortUrl: string
  expiresAt: string | null
}

export function BulkURLShortener() {
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<BulkResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a JSON file")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const fileContent = await file.text()
      const jsonData = JSON.parse(fileContent)

      const res = await fetch("/api/shorten/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: jsonData }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to shorten URLs")
      }

      const data = await res.json()
      setResults(data.urls)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process URLs")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "shortened-urls.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="jsonFile">Upload JSON File (Max 250 URLs)</Label>
        <input
          id="jsonFile"
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        <p className="text-sm text-gray-500">
          JSON format: [{"{"}"url": "https://example.com", "expiration": "never"{"}"}]
        </p>
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={!file || isLoading}
        className="w-full"
      >
        {isLoading ? "Processing..." : "Shorten URLs"}
      </Button>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Results</h3>
            <Button onClick={handleDownload} variant="outline" size="sm">
              Download JSON
            </Button>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-50 rounded-md text-sm space-y-1"
              >
                <div className="text-gray-600">Original: {result.originalUrl}</div>
                <a
                  href={result.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 break-all"
                >
                  {result.shortUrl}
                </a>
                {result.expiresAt && (
                  <div className="text-gray-500">
                    Expires: {new Date(result.expiresAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}