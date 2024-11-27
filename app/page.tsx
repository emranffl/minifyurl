"use client"
import { BulkURLShortener } from "@/components/bulk-url-shortener"
import { Button } from "@/components/ui/button"
import { URLShortenerForm } from "@/components/url-shortener-form"
import { motion } from "framer-motion"
import { BarChart, Clock, Link, Shield, Upload, Zap } from "lucide-react"
import { useState } from "react"

const features = [
  {
    icon: Link,
    title: "Custom Short URLs",
    description: "Create branded links with custom aliases that reflect your brand",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Powered by Redis cache for instant redirects and optimal performance",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Built-in protection against malicious URLs and phishing attempts",
  },
  {
    icon: Clock,
    title: "Expiration Control",
    description: "Set custom expiration dates for your shortened URLs",
  },
  {
    icon: BarChart,
    title: "Analytics",
    description: "Track clicks and monitor your links' performance in real-time",
  },
  {
    icon: Upload,
    title: "Bulk Processing",
    description: "Shorten multiple URLs at once with our bulk upload feature",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Home() {
  const [mode, setMode] = useState<"single" | "bulk">("single")

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-b from-white to-gray-50 pb-16"
      >
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-5xl font-bold text-gray-900"
          >
            Transform Your Links
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 text-xl text-gray-600"
          >
            Create short, branded links with our powerful URL shortener
          </motion.p>

          {/* URL Shortener Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex space-x-2">
              <Button
                variant={mode === "single" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("single")}
              >
                Single URL
              </Button>
              <Button
                variant={mode === "bulk" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("bulk")}
              >
                Bulk Upload
              </Button>
            </div>
            {mode === "single" ? <URLShortenerForm /> : <BulkURLShortener />}
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center text-3xl font-bold"
          >
            Powerful Features for Your Links
          </motion.h2>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={item}
                className="rounded-xl bg-white p-6 shadow-md transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-blue-600 py-20 text-white"
      >
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to get started?</h2>
          <p className="mb-8 text-lg">
            Join thousands of users who trust our service for their link management needs
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
            Sign Up Now - It's Free
          </Button>
        </div>
      </motion.section>
    </main>
  )
}
