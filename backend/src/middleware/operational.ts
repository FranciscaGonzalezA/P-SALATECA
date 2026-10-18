import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';

// Bounded, process-local protection. Multiple replicas require a shared edge limiter.
export function rateLimiter(max: number, windowMs = 60000, capacity = 10000): RequestHandler {
  const clients = new Map<string, { count: number; expires: number }>();
  return (request, response, next) => {
    if (request.path.startsWith('/api/v1/health')) return next();
    const now = Date.now();
    const key = request.ip ?? 'unknown';
    let entry = clients.get(key);
    if (!entry || entry.expires <= now) {
      if (clients.size >= capacity) {
        for (const [ip, value] of clients) if (value.expires <= now) clients.delete(ip);
        if (clients.size >= capacity && !entry) {
          response.setHeader('Retry-After', '60');
          response.status(503).json({ error: 'capacity_exceeded' });
          return;
        }
      }
      entry = { count: 0, expires: now + windowMs };
      clients.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((entry.expires - now) / 1000))),
      );
      response.status(429).json({ error: 'rate_limit_exceeded' });
      return;
    }
    next();
  };
}

export const operationalHeaders: RequestHandler = (_request, response, next) => {
  const requestId = randomUUID();
  const start = performance.now();
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  response.setHeader('Cache-Control', 'no-store');
  response.once('finish', () => {
    // Deliberately omit URL/query strings, bodies, IPs and credentials.
    console.info(
      JSON.stringify({
        event: 'http_request',
        requestId,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - start),
      }),
    );
  });
  next();
};
