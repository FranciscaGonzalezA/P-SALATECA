import type { Pool, PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MysqlIngestionRepository } from './mysqlIngestionRepository.js';
import type { IngestionTransaction, NormalizedScreeningDto } from './ingestion.types.js';

const screening: NormalizedScreeningDto = {
  movieTitle: 'La casa lobo',
  venueName: 'Sala K',
  movieKey: 'la-casa-lobo',
  venueKey: 'sala-k',
  screeningDate: '2026-08-01',
  screeningTime: '20:00',
  startsAt: '2026-08-02T00:00:00.000Z',
  sourceTimezone: 'America/Santiago',
  sourceUrl: 'https://example.com/funcion',
  sourceType: 'website',
  sourceRecordKey: 'record-1',
  capturedAt: '2026-07-27T12:00:00.000Z',
  language: 'Español',
  format: '2D',
  duplicateKey: 'la-casa-lobo:sala-k:2026-08-02T00:00:00.000Z',
};

function createConnection() {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    query: vi.fn().mockResolvedValue([[]]),
    execute: vi.fn(),
  };
}

async function withTransaction(
  connection: ReturnType<typeof createConnection>,
  operation: (transaction: IngestionTransaction) => Promise<void>,
) {
  const pool = {
    getConnection: vi.fn().mockResolvedValue(connection as unknown as PoolConnection),
  } as unknown as Pool;
  await new MysqlIngestionRepository(pool).withTransaction(operation);
}

describe('MysqlIngestionRepository', () => {
  let connection: ReturnType<typeof createConnection>;

  beforeEach(() => {
    connection = createConnection();
  });

  it('confirma y libera una transacción exitosa', async () => {
    await withTransaction(connection, async () => undefined);

    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('revierte y libera una transacción fallida', async () => {
    await expect(
      withTransaction(connection, async () => {
        throw new Error('fallo');
      }),
    ).rejects.toThrow('fallo');

    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('persiste fuente, ejecución, staging, errores y resumen con parámetros', async () => {
    connection.execute
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await withTransaction(connection, async (transaction) => {
      expect(
        await transaction.upsertSource({
          name: 'Fuente',
          type: 'website',
          baseUrl: 'https://example.com',
        }),
      ).toBe(10);
      expect(await transaction.createRun(10)).toBe(20);
      expect(
        await transaction.stageRecord(
          20,
          { rawPayload: { sourceUrl: screening.sourceUrl }, normalizedPayload: screening },
          screening,
        ),
      ).toBe(30);
      await transaction.recordErrors(20, 30, [
        { field: 'record', code: 'invalid', message: 'Inválido' },
      ]);
      await transaction.markStaging(30, 'rejected', [
        { field: 'record', code: 'invalid', message: 'Inválido' },
      ]);
      await transaction.finishRun(20, 'partially_succeeded', {
        processed: 2,
        inserted: 1,
        updated: 0,
        rejected: 1,
        duplicates: 0,
      });
    });

    expect(connection.execute).toHaveBeenCalledTimes(6);
    expect(connection.execute.mock.calls[2]?.[1]?.[1]).toBe(screening.sourceUrl);
    expect(connection.execute.mock.calls[5]?.[1]).toEqual(['partially_succeeded', 2, 1, 1, 0, 20]);
  });

  it('usa una URL segura en staging cuando el valor rechazado excede la columna', async () => {
    connection.execute.mockResolvedValueOnce([{ insertId: 30 }]);

    await withTransaction(connection, async (transaction) => {
      await transaction.stageRecord(
        20,
        {
          rawPayload: { sourceUrl: `https://example.com/${'a'.repeat(2_100)}` },
          normalizedPayload: {},
        },
        null,
      );
    });

    expect(connection.execute.mock.calls[0]?.[1]?.[1]).toBe('about:blank');
  });

  it('crea una función nueva y detecta una repetición idéntica', async () => {
    connection.execute.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO movies')) return Promise.resolve([{ insertId: 7 }]);
      if (sql.includes('INSERT INTO venues')) return Promise.resolve([{ insertId: 8 }]);
      if (sql.includes('SELECT id, source_id')) return Promise.resolve([[]]);
      return Promise.resolve([{}]);
    });

    await withTransaction(connection, async (transaction) => {
      await expect(transaction.publishScreening(10, 30, screening)).resolves.toBe('inserted');
    });
    expect(
      connection.execute.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO screenings')),
    ).toBe(true);

    connection.execute.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO movies')) return Promise.resolve([{ insertId: 7 }]);
      if (sql.includes('INSERT INTO venues')) return Promise.resolve([{ insertId: 8 }]);
      if (sql.includes('SELECT id, source_id')) {
        return Promise.resolve([
          [
            {
              id: 9,
              source_id: 10,
              official_url: screening.sourceUrl,
              language: screening.language,
              screening_format: screening.format,
            },
          ],
        ]);
      }
      return Promise.resolve([{}]);
    });

    await withTransaction(connection, async (transaction) => {
      await expect(transaction.publishScreening(10, 31, screening)).resolves.toBe('duplicate');
    });
  });

  it('actualiza una función cuando cambia su procedencia o metadatos', async () => {
    connection.execute.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO movies')) return Promise.resolve([{ insertId: 7 }]);
      if (sql.includes('INSERT INTO venues')) return Promise.resolve([{ insertId: 8 }]);
      if (sql.includes('SELECT id, source_id')) {
        return Promise.resolve([
          [
            {
              id: 9,
              source_id: 99,
              official_url: 'https://old.example.com',
              language: null,
              screening_format: null,
            },
          ],
        ]);
      }
      return Promise.resolve([{}]);
    });

    await withTransaction(connection, async (transaction) => {
      await expect(transaction.publishScreening(10, 30, screening)).resolves.toBe('updated');
    });
    expect(
      connection.execute.mock.calls.some(([sql]) => String(sql).includes('UPDATE screenings')),
    ).toBe(true);
  });

  it('aísla operaciones mediante savepoints y valida sus nombres', async () => {
    await withTransaction(connection, async (transaction) => {
      await expect(transaction.runInSavepoint('screening_1', async () => 42)).resolves.toBe(42);
      await expect(
        transaction.runInSavepoint('screening_2', async () => {
          throw new Error('registro inválido');
        }),
      ).rejects.toThrow('registro inválido');
      await expect(transaction.runInSavepoint('nombre peligroso', async () => 1)).rejects.toThrow(
        'Nombre de savepoint inválido',
      );
    });

    expect(connection.query.mock.calls.map(([sql]) => sql)).toEqual([
      'SAVEPOINT screening_1',
      'RELEASE SAVEPOINT screening_1',
      'SAVEPOINT screening_2',
      'ROLLBACK TO SAVEPOINT screening_2',
      'RELEASE SAVEPOINT screening_2',
    ]);
  });
});
