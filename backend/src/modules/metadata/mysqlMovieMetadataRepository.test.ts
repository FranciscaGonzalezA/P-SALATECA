import type { Pool, PoolConnection } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { MysqlMovieMetadataRepository } from './mysqlMovieMetadataRepository.js';

function poolWithConnection() {
  const connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    execute: vi.fn(),
  };
  const pool = {
    getConnection: vi.fn().mockResolvedValue(connection as unknown as PoolConnection),
    execute: vi.fn(),
  } as unknown as Pool;
  return { pool, connection };
}

describe('MysqlMovieMetadataRepository', () => {
  it('lee el estado actual de la ficha por título canónico', async () => {
    const { pool } = poolWithConnection();
    vi.mocked(pool.execute).mockResolvedValueOnce([
      [
        {
          id: 4,
          title: 'La casa lobo',
          tmdb_id: null,
          original_title: null,
          release_year: null,
          duration_minutes: null,
          director: null,
          synopsis: null,
          metadata_synced_at: null,
          has_poster: 0,
          has_genres: 0,
        },
      ],
      [],
    ] as never);

    const result = await new MysqlMovieMetadataRepository(pool).findByCanonicalTitle(
      'la-casa-lobo',
    );

    expect(result).toMatchObject({ id: 4, title: 'La casa lobo', hasPoster: false });
    expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('m.canonical_title = ?'), [
      'la-casa-lobo',
    ]);
  });

  it('guarda campos faltantes, géneros y afiche dentro de una transacción', async () => {
    const { pool, connection } = poolWithConnection();
    connection.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await new MysqlMovieMetadataRepository(pool).saveMetadata(4, {
      tmdbId: 99,
      originalTitle: 'Original',
      releaseYear: 2020,
      durationMinutes: 90,
      director: 'Directora',
      synopsis: 'Sinopsis',
      genres: ['Drama'],
      posterUrl: 'https://image.tmdb.org/t/p/w780/poster.jpg',
    });

    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(connection.execute.mock.calls[1]?.[0]).toContain('COALESCE(original_title, ?)');
    expect(connection.execute.mock.calls.at(-1)?.[0]).toContain('INSERT INTO content_assets');
  });

  it('completa un alias sin repetir un tmdb_id que pertenece a otra película', async () => {
    const { pool, connection } = poolWithConnection();
    connection.execute
      .mockResolvedValueOnce([[{ id: 8 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ insertId: 10 }]);

    await new MysqlMovieMetadataRepository(pool).saveMetadata(4, {
      tmdbId: 99,
      originalTitle: 'Original',
      releaseYear: 2020,
      durationMinutes: null,
      director: null,
      synopsis: null,
      genres: [],
      posterUrl: null,
    });

    expect(connection.execute.mock.calls[1]?.[1]?.[0]).toBeNull();
    expect(connection.commit).toHaveBeenCalledOnce();
  });
});
