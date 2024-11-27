import { Queue, Worker, QueueScheduler } from 'bullmq'
import { redis } from '../redis'
import { updateQueueSize } from '../monitoring/metrics'

// Initialize queues for different operations
export const queues = {
  urlProcessing: new Queue('url-processing', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    }
  }),
  
  analytics: new Queue('analytics-processing', {
    connection: redis
  })
}

// Initialize queue scheduler
const scheduler = new QueueScheduler('url-processing', {
  connection: redis
})

// URL Processing Worker
const urlWorker = new Worker('url-processing', async job => {
  const { url, type } = job.data
  
  switch (type) {
    case 'create':
      // Handle URL creation
      break
    case 'validate':
      // Handle URL validation
      break
    case 'cleanup':
      // Handle expired URL cleanup
      break
  }
}, {
  connection: redis,
  concurrency: 10
})

// Analytics Worker
const analyticsWorker = new Worker('analytics-processing', async job => {
  const { shortUrl, event } = job.data
  
  // Process analytics event
  // This could be tracking clicks, gathering metrics, etc.
}, {
  connection: redis,
  concurrency: 5
})

// Monitor queue sizes
setInterval(async () => {
  const size = await queues.urlProcessing.count()
  updateQueueSize(size)
}, 5000)

// Error handling
urlWorker.on('error', err => {
  console.error('URL Processing Error:', err)
})

analyticsWorker.on('error', err => {
  console.error('Analytics Processing Error:', err)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    urlWorker.close(),
    analyticsWorker.close(),
    ...Object.values(queues).map(queue => queue.close())
  ])
})