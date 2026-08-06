import request from 'supertest';
import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();

vi.mock('../db/pool.js', () => ({
  databasePool: { query },
}));

const { healthRouter } = await import('./health.js');

describe('healthRouter', () => {
  const app = express().use('/health', healthRouter);

  beforeEach(() => {
    query.mockReset();
  });

  it('informa disponibilidad cuando MySQL responde', async () => {
    query.mockResolvedValueOnce([]);
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'connected' });
    expect(Date.parse(response.body.timestamp)).not.toBeNaN();
  });

  it('degrada el servicio cuando MySQL no está disponible', async () => {
    query.mockRejectedValueOnce(new Error('sin conexión'));
    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'degraded', database: 'unavailable' });
  });
});
