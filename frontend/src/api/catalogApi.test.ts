import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCatalogUrl,
  CatalogApiError,
  fetchCatalog,
  fetchGenres,
  fetchMovie,
  fetchVenues,
} from './catalogApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildCatalogUrl', () => {
  it('serializa filtros combinados sin concatenar valores manualmente', () => {
    const url = new URL(
      buildCatalogUrl(
        {
          date: '2026-08-01',
          time: '20:00',
          venue: 'cine-arte-normandie',
          genre: 'drama',
          search: 'casa lobo',
          page: 2,
          pageSize: 6,
        },
        'https://api.example.com/api/v1',
      ),
    );

    expect(Object.fromEntries(url.searchParams)).toEqual({
      fecha: '2026-08-01',
      horario: '20:00',
      sala: 'cine-arte-normandie',
      genero: 'drama',
      buscar: 'casa lobo',
      pagina: '2',
      limite: '6',
    });
  });

  it('omite filtros ausentes y codifica caracteres especiales', () => {
    const url = new URL(
      buildCatalogUrl(
        { search: 'Ñuñoa & cine', page: 1, pageSize: 12 },
        'https://api.example.com/api/v1',
      ),
    );

    expect(Object.fromEntries(url.searchParams)).toEqual({
      buscar: 'Ñuñoa & cine',
      pagina: '1',
      limite: '12',
    });
  });
});

describe('cliente de catálogo', () => {
  it('consume respuestas exitosas de catálogo, detalle y taxonomías', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            meta: { page: 1, pageSize: 6, total: 0, totalPages: 0, elapsedMs: 4 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 1, title: 'Película' } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 1, slug: 'sala-k' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 1, slug: 'drama' }] })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCatalog({ page: 1, pageSize: 6 })).resolves.toEqual({
      items: [],
      total: 0,
      totalPages: 0,
      elapsedMs: 4,
      demo: false,
    });
    await expect(fetchMovie(1)).resolves.toMatchObject({ demo: false });
    await expect(fetchVenues()).resolves.toEqual([{ id: 1, slug: 'sala-k' }]);
    await expect(fetchGenres()).resolves.toEqual([{ id: 1, slug: 'drama' }]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Accept: 'application/json' },
    });
  });

  it('usa datos demo frente a indisponibilidad durante desarrollo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sin conexión')));

    const catalog = await fetchCatalog({ search: 'Patricio', page: 1, pageSize: 2 });
    const movie = await fetchMovie(1);

    expect(catalog.demo).toBe(true);
    expect(catalog.items).toHaveLength(2);
    expect(movie.demo).toBe(true);
    await expect(fetchVenues()).resolves.not.toHaveLength(0);
    await expect(fetchGenres()).resolves.not.toHaveLength(0);
  });

  it('no oculta cancelaciones solicitadas por el consumidor', async () => {
    const abortError = new DOMException('Abortado', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(fetchCatalog({ page: 1, pageSize: 6 })).rejects.toBe(abortError);
    await expect(fetchMovie(1)).rejects.toBe(abortError);
    await expect(fetchVenues()).rejects.toBe(abortError);
    await expect(fetchGenres()).rejects.toBe(abortError);
  });

  it('construye errores tipados con estado HTTP', () => {
    const error = new CatalogApiError('No encontrada', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'CatalogApiError', message: 'No encontrada', status: 404 });
  });
});
