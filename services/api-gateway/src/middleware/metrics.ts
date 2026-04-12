import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export const register = new Registry();

// Add default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register, prefix: 'api_gateway_' });

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpActiveRequests = new Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  labelNames: ['service'],
  registers: [register],
});

export const websocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

const SERVICE_NAME = 'api-gateway';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Don't track metrics endpoint itself
  if (req.path === '/metrics') {
    return next();
  }

  httpActiveRequests.inc({ service: SERVICE_NAME });
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = normalizeRoute(req.path);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
      service: SERVICE_NAME,
    };
    httpRequestsTotal.inc(labels);
    end(labels);
    httpActiveRequests.dec({ service: SERVICE_NAME });
  });

  next();
}

function normalizeRoute(path: string): string {
  // Normalize dynamic segments to reduce cardinality
  return path
    .replace(/\/ORD-\d+/g, '/:orderId')
    .replace(/\/[0-9a-f]{24}/g, '/:id')
    .replace(/\/\d+/g, '/:id');
}
