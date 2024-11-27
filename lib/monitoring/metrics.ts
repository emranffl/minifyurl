import { Registry, Counter, Gauge } from 'prometheus-client'
import StatsD from 'node-statsd'

// Initialize Prometheus registry
const register = new Registry()

// Initialize StatsD client
const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: parseInt(process.env.STATSD_PORT || '8125'),
  prefix: 'minifyurl.'
})

// Prometheus metrics
export const metrics = {
  requestsTotal: new Counter({
    name: 'requests_total',
    help: 'Total number of requests',
    labelNames: ['endpoint', 'status']
  }),
  
  responseTime: new Gauge({
    name: 'response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['endpoint']
  }),
  
  redirectsTotal: new Counter({
    name: 'redirects_total',
    help: 'Total number of URL redirects',
    labelNames: ['status']
  }),
  
  cacheHits: new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  }),
  
  activeDatabaseConnections: new Gauge({
    name: 'active_db_connections',
    help: 'Number of active database connections'
  }),
  
  queueSize: new Gauge({
    name: 'queue_size',
    help: 'Current size of the processing queue'
  })
}

// Register metrics
Object.values(metrics).forEach(metric => register.register(metric))

// Helper functions for tracking metrics
export const trackRequest = (endpoint: string, status: number, duration: number) => {
  metrics.requestsTotal.inc({ endpoint, status: status.toString() })
  metrics.responseTime.set({ endpoint }, duration)
  
  // StatsD timing
  statsd.timing(`request.${endpoint}`, duration)
  statsd.increment(`status_codes.${status}`)
}

export const trackRedirect = (status: number) => {
  metrics.redirectsTotal.inc({ status: status.toString() })
  statsd.increment('redirects')
}

export const trackCacheHit = (type: 'redis' | 'memory') => {
  metrics.cacheHits.inc({ cache_type: type })
  statsd.increment(`cache.${type}.hit`)
}

export const updateDatabaseConnections = (count: number) => {
  metrics.activeDatabaseConnections.set(count)
  statsd.gauge('db.connections', count)
}

export const updateQueueSize = (size: number) => {
  metrics.queueSize.set(size)
  statsd.gauge('queue.size', size)
}

// Endpoint for Prometheus to scrape metrics
export async function getMetrics(): Promise<string> {
  return register.metrics()
}