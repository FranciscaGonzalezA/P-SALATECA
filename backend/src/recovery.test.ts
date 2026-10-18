import ExcelJS from 'exceljs';
import express from 'express';
import { once } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./config/env.js', () => ({ env: { FRONTEND_ORIGIN: 'http://localhost:5173' } }));
vi.mock('./db/pool.js', () => ({ databasePool: { query: vi.fn() } }));
import { createAdminIngestionRouter } from './modules/ingestion/adminIngestion.routes.js';
import { parseExcelScreenings } from './modules/ingestion/excelScreeningsParser.js';
import { createApp } from './app.js';
import { databasePool } from './db/pool.js';

async function workbook(headers = ['Fecha parseada', 'Fecha texto', 'Pelicula', 'Sala', 'URL']) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Cartelera');
  sheet.addRow(headers);
  sheet.addRow([
    '2026-10-18 19:00',
    '',
    'Una película',
    'Sala de cine',
    'https://cine.example/cartelera',
  ]);
  return Buffer.from(await book.xlsx.writeBuffer());
}

async function withServer(app: express.Express, run: (base: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  try {
    if (!server.listening) await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No server address');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }
}

describe('Recovered release, without database access', () => {
  it('parses XLSX with Santiago time and rejects missing columns', async () => {
    const [record] = await parseExcelScreenings(await workbook());
    expect(record?.normalizedPayload).toMatchObject({
      movieTitle: 'Una película',
      startsAt: '2026-10-18T22:00:00.000Z',
      sourceTimezone: 'America/Santiago',
    });
    await expect(parseExcelScreenings(await workbook(['wrong']))).rejects.toThrow(
      'Faltan columnas',
    );
    await expect(parseExcelScreenings(Buffer.from('invalid'))).rejects.toThrow();
  });

  it('imports an authenticated XLSX through the route using an in-memory transaction', async () => {
    const transaction = {
      upsertSource: vi.fn(async () => 1),
      createRun: vi.fn(async () => 2),
      stageRecord: vi.fn(async () => 3),
      publishScreening: vi.fn(async () => 'inserted'),
      runInSavepoint: vi.fn(async (_name, work) => work()),
      markStaging: vi.fn(),
      recordErrors: vi.fn(),
      finishRun: vi.fn(),
    };
    const app = express();
    app.use(
      '/api/v1',
      createAdminIngestionRouter(
        { findUserByToken: async () => ({ id: 1, role: 'admin' }) } as never,
        { withTransaction: async (work) => work(transaction) } as never,
      ),
    );
    const payload = await workbook();
    await withServer(app, async (base) => {
      const url = `${base}/api/v1/admin/screenings/import`;
      const headers = {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Cookie: 'salateca_session=test',
        Origin: 'http://localhost:5173',
      };
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': headers['Content-Type'] },
            body: payload,
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: { ...headers, Origin: 'https://other.example' },
            body: payload,
          })
        ).status,
      ).toBe(403);
      const response = await fetch(url, { method: 'POST', headers, body: payload });
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({
        processed: 1,
        inserted: 1,
        status: 'succeeded',
      });
      expect(transaction.publishScreening).toHaveBeenCalledOnce();
    });
  });

  it('does not mount scraper ingestion or query the database for liveness', async () => {
    await withServer(createApp(), async (base) => {
      expect((await fetch(`${base}/api/v1/health/live`)).status).toBe(200);
      expect((await fetch(`${base}/api/v1/ingestion/scraper`, { method: 'POST' })).status).toBe(
        404,
      );
      expect(
        (await fetch(`${base}/api/v1/scraper/screenings/import`, { method: 'POST' })).status,
      ).toBe(404);
      expect(
        (await fetch(`${base}/api/v1/internal/scraper/ingest`, { method: 'POST' })).status,
      ).toBe(404);
      expect(databasePool.query).not.toHaveBeenCalled();
    });
  });
});
