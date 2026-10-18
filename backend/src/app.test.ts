import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./config/env.js', () => ({
  env: { FRONTEND_ORIGIN: 'https://example.com', RATE_LIMIT_MAX: 5 },
}));
vi.mock('./db/pool.js', () => ({ databasePool: { query: vi.fn() } }));
import { createApp } from './app.js';
import { databasePool } from './db/pool.js';

describe('API operational controls', () => {
  const server = createApp().listen(0, '127.0.0.1');
  let base: string;
  beforeAll(async () => {
    if (!server.listening) await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing address');
    base = `http://127.0.0.1:${address.port}`;
  });
  afterAll(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  );
  it('keeps liveness independent of the database', async () => {
    const response = await fetch(`${base}/api/v1/health/live`);
    expect(response.status).toBe(200);
    expect(databasePool.query).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('reports database failures and recovery through readiness', async () => {
    vi.mocked(databasePool.query).mockRejectedValueOnce(new Error('secret connection info'));
    const failed = await fetch(`${base}/api/v1/health/ready`);
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain('secret');
    vi.mocked(databasePool.query).mockResolvedValueOnce([[], []] as never);
    expect((await fetch(`${base}/api/v1/health/ready`)).status).toBe(200);
  });
  it('rejects malformed JSON without exposing internals', async () => {
    const response = await fetch(`${base}/api/v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_json');
  });
  it('allows only the configured browser origin', async () => {
    const response = await fetch(`${base}/api/v1`, {
      headers: { Origin: 'https://attacker.example' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com');
  });
  it('limits bursts while keeping probes available', async () => {
    for (let index = 0; index < 6; index++) await fetch(`${base}/api/v1`);
    const response = await fetch(`${base}/api/v1`);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeTruthy();
    expect((await fetch(`${base}/api/v1/health/live`)).status).toBe(200);
  });
});
