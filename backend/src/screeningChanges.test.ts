import ExcelJS from 'exceljs';
import express from 'express';
import { once } from 'node:events';
import { expect, it, vi } from 'vitest';
vi.mock('./config/env.js', () => ({ env: { FRONTEND_ORIGIN: 'http://localhost:5173' } }));
vi.mock('./db/pool.js', () => ({ databasePool: {} }));
import { MysqlIngestionRepository } from './modules/ingestion/mysqlIngestionRepository.js';
import { createAdminIngestionRouter } from './modules/ingestion/adminIngestion.routes.js';
import { parseExcelScreenings } from './modules/ingestion/excelScreeningsParser.js';

const headers = [
  'Fecha parseada',
  'Fecha texto',
  'Pelicula',
  'Sala',
  'URL',
  'ID funcion',
  'Estado',
];
const row = (id = '', state = '', hour = '19:00') => [
  `2026-10-20 ${hour}`,
  '',
  'Una película',
  'Sala',
  'https://cine.example',
  id,
  state,
];
async function xlsx(rows: string[][], legacy = false) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Cartelera');
  sheet.addRow(legacy ? headers.slice(0, 5) : headers);
  rows.forEach((values) => sheet.addRow(legacy ? values.slice(0, 5) : values));
  return Buffer.from(await book.xlsx.writeBuffer());
}

// In-memory SQL adapter: exercises the real repository, service and HTTP route,
// without loading credentials or connecting to any database.
function isolatedPool() {
  type StoredScreening = Record<string, unknown> & { id: number; starts_at: Date | string };
  const screenings: StoredScreening[] = [];
  let snapshot: StoredScreening[] = [];
  const timestamp = (value: unknown) =>
    value instanceof Date
      ? value.getTime()
      : new Date(`${String(value).replace(' ', 'T')}Z`).getTime();
  const connection = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    query: vi.fn(async (sql: string) => {
      if (sql.startsWith('SAVEPOINT')) snapshot = structuredClone(screenings);
      if (sql.startsWith('ROLLBACK TO')) screenings.splice(0, screenings.length, ...snapshot);
      return [[]];
    }),
    execute: vi.fn(async (query: string, p: unknown[] = []) => {
      const sql = query.replace(/\s+/g, ' ').trim();
      if (sql.startsWith('SELECT * FROM screenings WHERE stable_id')) {
        return [screenings.filter((s) => s.stable_id === p[0]).map((s) => ({ ...s }))];
      }
      if (sql.startsWith('SELECT * FROM screenings')) {
        return [
          screenings
            .filter(
              (s) =>
                s.movie_id === p[0] &&
                s.venue_id === p[1] &&
                timestamp(s.starts_at) === timestamp(p[2]),
            )
            .map((s) => ({ ...s })),
        ];
      }
      if (sql.startsWith('SELECT id FROM movies')) return [[{ id: 1 }]];
      if (sql.startsWith('INSERT INTO screenings')) {
        const keys = [
          'movie_id',
          'stable_id',
          'venue_id',
          'source_id',
          'staging_record_id',
          'screening_date',
          'screening_time',
          'starts_at',
          'source_timezone',
          'language',
          'screening_format',
          'official_url',
          'captured_at',
        ];
        screenings.push({
          id: screenings.length + 1,
          status: 'scheduled',
          ...Object.fromEntries(keys.map((key, i) => [key, p[i]])),
          starts_at: p[7] as Date,
        });
      }
      if (sql.startsWith("UPDATE screenings SET status = 'cancelled'")) {
        Object.assign(
          screenings.find((s) => s.id === p[2])!,
          { status: 'cancelled' },
        );
      } else if (sql.startsWith('UPDATE screenings SET')) {
        const keys = [
          'stable_id',
          'status',
          'starts_at',
          'source_id',
          'staging_record_id',
          'screening_date',
          'screening_time',
          'source_timezone',
          'language',
          'screening_format',
          'official_url',
          'captured_at',
        ];
        Object.assign(
          screenings.find((s) => s.id === p[12])!,
          Object.fromEntries(keys.map((key, i) => [key, p[i]])),
        );
      }
      return [{ insertId: 1 }];
    }),
  };
  return { screenings, connection, pool: { getConnection: async () => connection } };
}

it('imports, adopts legacy rows, reschedules, cancels, retries and preserves omitted rows through HTTP', async () => {
  const db = isolatedPool();
  const app = express();
  app.use(
    createAdminIngestionRouter(
      { findUserByToken: async () => ({ id: 1, role: 'admin' }) } as never,
      new MysqlIngestionRepository(db.pool as never),
    ),
  );
  const server = app.listen(0, '127.0.0.1');
  try {
    if (!server.listening) await once(server, 'listening');
    const address = server.address() as { port: number };
    async function upload(rows: string[][], legacy = false) {
      const response = await fetch(`http://127.0.0.1:${address.port}/admin/screenings/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Cookie: 'salateca_session=test',
          Origin: 'http://localhost:5173',
        },
        body: await xlsx(rows, legacy),
      });
      expect(response.status).toBe(200);
      return (await response.json()).data;
    }
    expect(await upload([row()], true)).toMatchObject({ inserted: 1 });
    expect(await upload([row('cine-1')])).toMatchObject({ updated: 1 });
    expect(db.screenings).toHaveLength(1);
    expect(await upload([row('cine-1', '', '20:30')])).toMatchObject({ updated: 1 });
    expect((db.screenings[0]?.starts_at as Date).toISOString()).toBe('2026-10-20T23:30:00.000Z');
    // mysql2 returns UTC date strings in the application configuration.
    db.screenings[0]!.starts_at = '2026-10-20 23:30:00.000';
    expect(await upload([row('cine-1', '', '20:30')])).toMatchObject({ duplicates: 1 });
    expect(await upload([row('cine-2', '', '21:00')])).toMatchObject({ inserted: 1 });
    expect(db.screenings[0]?.status).toBe('scheduled'); // omitted cine-1 is unchanged
    expect(await upload([row('cine-1', 'cancelada')])).toMatchObject({
      cancelled: 1,
      status: 'succeeded',
    });
    expect(db.screenings[0]?.status).toBe('cancelled');
    expect(await upload([row('cine-1', 'cancelada')])).toMatchObject({
      duplicates: 1,
      cancelled: 0,
    });
    expect(await upload([row('', '', '20:30')], true)).toMatchObject({ duplicates: 1 });
    expect(db.screenings[0]?.status).toBe('cancelled');
    expect(await upload([row('cine-1', 'programada', '20:30')])).toMatchObject({ updated: 1 });
    expect(db.screenings[0]?.status).toBe('scheduled');
    const conflict = await upload([row('cine-1', '', '21:00'), row('missing', 'cancelada')]);
    expect(conflict).toMatchObject({ rejected: 2, status: 'failed' });
    expect(conflict.errors.map((e: { rowNumber: number }) => e.rowNumber)).toEqual([2, 3]);
    expect(db.screenings).toHaveLength(2);
    expect(db.screenings[0]?.screening_time).toBe('20:30');
    expect(await upload([row('other', '', '20:30')])).toMatchObject({ rejected: 1 });
    expect(await upload([row('cine-1'), row('cine-1', 'cancelada')])).toMatchObject({
      rejected: 2,
    });
    expect(await upload([row('missing', 'cancelada'), row('cine-2', 'cancelada')])).toMatchObject({
      rejected: 1,
      cancelled: 1,
      status: 'partially_succeeded',
    });
    expect(db.connection.query.mock.calls.some(([sql]) => sql.startsWith('ROLLBACK TO'))).toBe(
      true,
    );
    expect(db.connection.commit).toHaveBeenCalled();
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }
});

it('validates optional columns and preserves the legacy format', async () => {
  const records = await parseExcelScreenings(
    await xlsx([
      row('', 'cancelada'),
      row('bad id'),
      row('valid', 'unknown'),
      row('same'),
      row('same'),
    ]),
  );
  expect(records.every((record) => record.validationIssues?.length)).toBe(true);
  const legacy = await parseExcelScreenings(await xlsx([row()], true));
  expect(legacy[0]?.validationIssues).toBeUndefined();
});
