import type { Pool } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MysqlCatalogRepository } from './mysqlCatalogRepository.js';

const baseRow = {
  movie_id: 7,
  title: 'La casa lobo',
  original_title: null,
  release_year: 2018,
  duration_minutes: 75,
  director: 'Cristóbal León',
  synopsis: 'Sinopsis',
  movie_updated_at: '2026-07-27 12:00:00.000',
  poster_url: null,
  genre_id: 1,
  genre_name: 'Animación',
  genre_slug: 'animacion',
  screening_id: 20,
  screening_date: '2026-08-01',
  screening_time: '20:00:00',
  starts_at: '2026-08-02 00:00:00.000',
  language: 'Español',
  screening_format: '2D',
  official_url: 'https://example.com/funcion',
  captured_at: '2026-07-27 12:00:00.000',
  venue_id: 2,
  venue_name: 'Sala K',
  venue_slug: 'sala-k',
  venue_address: null,
  municipality: 'Providencia',
  venue_website_url: null,
  source_id: 3,
  source_name: 'Sala K',
  source_type: 'website',
  source_url: 'https://example.com',
  last_successful_sync_at: '2026-07-27 12:00:00.000',
};

describe('MysqlCatalogRepository', () => {
  const execute = vi.fn();
  const repository = new MysqlCatalogRepository({ execute } as unknown as Pool);

  beforeEach(() => {
    execute.mockReset();
  });

  it('parametriza filtros, conserva el orden paginado y elimina duplicados de joins', async () => {
    execute
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([
        [
          baseRow,
          { ...baseRow, genre_id: 2, genre_name: 'Cine chileno', genre_slug: 'cine-chileno' },
          baseRow,
        ],
      ]);

    const result = await repository.listCatalog({
      date: '2026-08-01',
      time: '20:00',
      venue: 'sala-k',
      genre: 'animacion',
      search: 'Cristóbal',
      page: 2,
      pageSize: 6,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 7,
      genres: [
        { id: 1, name: 'Animación', slug: 'animacion' },
        { id: 2, name: 'Cine chileno', slug: 'cine-chileno' },
      ],
    });
    expect(result.items[0]?.screenings).toHaveLength(1);

    const [countSql, countValues] = execute.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain('m.director LIKE');
    expect(countValues).toEqual([
      '2026-08-01',
      '20:00',
      'sala-k',
      'animacion',
      'Cristóbal',
      'Cristóbal',
      'Cristóbal',
    ]);
    expect(execute.mock.calls[1]?.[0]).toContain('LIMIT 6 OFFSET 6');
    expect(execute.mock.calls[1]?.[1]).toEqual(countValues);
    expect(execute.mock.calls[2]?.[1]).toEqual([7, ...countValues]);
  });

  it('rechaza paginación insegura antes de construir SQL', async () => {
    await expect(
      repository.listCatalog({ page: 1, pageSize: Number.POSITIVE_INFINITY }),
    ).rejects.toThrow('La paginación de cartelera no es válida.');
    expect(execute).not.toHaveBeenCalled();
  });

  it('evita consultas adicionales cuando no hay resultados', async () => {
    execute.mockResolvedValueOnce([[{ total: 0 }]]);

    await expect(repository.listCatalog({ page: 1, pageSize: 12 })).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[1]).toEqual([]);
  });

  it('mapea detalle y fechas MySQL a DTO ISO', async () => {
    execute.mockResolvedValueOnce([[baseRow]]);

    const movie = await repository.findMovie(7);

    expect(movie).toMatchObject({
      id: 7,
      updatedAt: '2026-07-27T12:00:00.000Z',
      screenings: [
        {
          time: '20:00',
          startsAt: '2026-08-02T00:00:00.000Z',
          capturedAt: '2026-07-27T12:00:00.000Z',
          source: { lastSuccessfulSyncAt: '2026-07-27T12:00:00.000Z' },
        },
      ],
    });
  });

  it('responde null si la película no existe y omite funciones incompletas', async () => {
    execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([
      [
        {
          ...baseRow,
          screening_id: null,
          screening_date: null,
          screening_time: null,
          starts_at: null,
          official_url: null,
          captured_at: null,
          genre_id: null,
          genre_name: null,
          genre_slug: null,
        },
      ],
    ]);

    await expect(repository.findMovie(404)).resolves.toBeNull();
    await expect(repository.listMovieScreenings(7)).resolves.toEqual([]);
  });

  it('lista funciones, salas y géneros en sus contratos públicos', async () => {
    execute
      .mockResolvedValueOnce([[baseRow]])
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            name: 'Sala K',
            slug: 'sala-k',
            address: null,
            municipality: 'Providencia',
            website_url: null,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 1, name: 'Animación', slug: 'animacion' }]]);

    await expect(repository.listMovieScreenings(7)).resolves.toHaveLength(1);
    await expect(repository.listVenues()).resolves.toEqual([
      {
        id: 2,
        name: 'Sala K',
        slug: 'sala-k',
        address: null,
        municipality: 'Providencia',
        websiteUrl: null,
      },
    ]);
    await expect(repository.listGenres()).resolves.toEqual([
      { id: 1, name: 'Animación', slug: 'animacion' },
    ]);
  });
});
