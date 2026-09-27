import { describe, expect, it, vi } from 'vitest';
import { normalizeMovieTitleQueries, TmdbClient } from './tmdbClient.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TmdbClient', () => {
  it('genera variantes seguras para ediciones, títulos alternativos y etiquetas de programación', () => {
    expect(normalizeMovieTitleQueries('  EL EXTRAÑO MUNDO DE JACK (doblada) ')).toEqual([
      { query: 'EL EXTRAÑO MUNDO DE JACK (doblada)' },
      { query: 'EL EXTRAÑO MUNDO DE JACK' },
    ]);
    expect(normalizeMovieTitleQueries('Cuéntame tu vida (Spellbound)')).toEqual([
      { query: 'Cuéntame tu vida (Spellbound)' },
      { query: 'Cuéntame tu vida' },
      { query: 'Spellbound' },
    ]);
    expect(normalizeMovieTitleQueries('Moonwalker / Cine Blondie')).toEqual([
      { query: 'Moonwalker / Cine Blondie' },
      { query: 'Moonwalker' },
    ]);
    expect(normalizeMovieTitleQueries('Batman [1989]')).toEqual([{ query: 'Batman', year: 1989 }]);
  });

  it('busca una coincidencia exacta y transforma su ficha', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: 1, title: 'La casa lobo', original_title: 'La casa lobo' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          original_title: 'La casa lobo',
          release_date: '2018-02-22',
          runtime: 75,
          overview: 'Una joven se refugia en una casa.',
          poster_path: '/afiche.jpg',
          vote_average: 7.4,
          vote_count: 321,
          popularity: 18.75,
          genres: [{ name: 'Animación' }, { name: 'Drama' }],
          credits: { crew: [{ job: 'Director', name: 'Cristóbal León' }] },
        }),
      );
    const client = new TmdbClient({ readAccessToken: 'token', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('La casa lobo')).resolves.toEqual({
      status: 'found',
      metadata: {
        tmdbId: 1,
        originalTitle: 'La casa lobo',
        releaseYear: 2018,
        durationMinutes: 75,
        director: 'Cristóbal León',
        synopsis: 'Una joven se refugia en una casa.',
        tmdbVoteAverage: 7.4,
        tmdbVoteCount: 321,
        tmdbPopularity: 18.75,
        genres: ['Animación', 'Drama'],
        posterUrl: 'https://image.tmdb.org/t/p/w780/afiche.jpg',
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer token',
    });
  });

  it('elige la primera película cuando hay varias coincidencias exactas', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { id: 1, title: 'Gloria', original_title: 'Gloria' },
            { id: 2, title: 'Gloria', original_title: 'Gloria' },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 1, original_title: 'Gloria' }));
    const client = new TmdbClient({ apiKey: 'key', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('Glória')).resolves.toMatchObject({
      status: 'found',
      metadata: { tmdbId: 1 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('api_key=key');
  });

  it('usa el primer resultado de búsqueda si no hay un título exacto', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 142,
              title: 'Brokeback Mountain',
              original_title: 'Brokeback Mountain',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 142, original_title: 'Brokeback Mountain' }));
    const client = new TmdbClient({ readAccessToken: 'token', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('Secreto en la montaña')).resolves.toMatchObject({
      status: 'found',
      metadata: { tmdbId: 142 },
    });
  });

  it('ignora mayúsculas, acentos y un artículo inicial si la coincidencia es única', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 277834,
              title: 'El planeta del tesoro',
              original_title: 'Treasure Planet',
              release_date: '2002-11-26',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 277834 }));
    const client = new TmdbClient({ readAccessToken: 'token', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('PLANÉTA DEL TESORO')).resolves.toMatchObject({
      status: 'found',
      metadata: { tmdbId: 277834 },
    });
  });

  it('prueba una variante sin el indicador de edición antes de declarar que no existe', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 9479,
              title: 'El extraño mundo de Jack',
              original_title: 'The Nightmare Before Christmas',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 9479 }));
    const client = new TmdbClient({ readAccessToken: 'token', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('El extraño mundo de Jack (doblada)')).resolves.toMatchObject({
      status: 'found',
      metadata: { tmdbId: 9479 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('usa el año anexado para distinguir películas con el mismo nombre', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { id: 1, title: 'Batman', original_title: 'Batman', release_date: '1966-07-30' },
            { id: 2, title: 'Batman', original_title: 'Batman', release_date: '1989-06-23' },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 2, release_date: '1989-06-23' }));
    const client = new TmdbClient({ readAccessToken: 'token', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('Batman (1989)')).resolves.toMatchObject({
      status: 'found',
      metadata: { tmdbId: 2, releaseYear: 1989 },
    });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('year=1989');
  });

  it('valida títulos localizados contra los nombres alternativos de TMDB', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 142,
              title: 'Brokeback Mountain',
              original_title: 'Brokeback Mountain',
              release_date: '2005-09-10',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 142,
          original_title: 'Brokeback Mountain',
          release_date: '2005-09-10',
          alternative_titles: { titles: [{ title: 'Secreto en la montaña' }] },
        }),
      );
    const client = new TmdbClient({ readAccessToken: 'token', fallbackLanguages: [], fetchImpl });

    await expect(client.findByTitle('SECRETO EN LA MONTAÑA')).resolves.toMatchObject({
      status: 'found',
      metadata: { tmdbId: 142, originalTitle: 'Brokeback Mountain' },
    });
  });

  it('informa errores HTTP sin incluir las credenciales', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 401));
    const client = new TmdbClient({
      readAccessToken: 'secreto',
      fallbackLanguages: [],
      fetchImpl,
    });

    await expect(client.findByTitle('Película')).rejects.toThrow('TMDB respondió HTTP 401');
  });

  it('completa sinopsis y afiche desde idiomas de respaldo', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: 7, title: 'Película', original_title: 'Movie' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 7, original_title: 'Movie', overview: '', poster_path: null }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 7, overview: 'Sinopsis en español.', poster_path: '/poster.jpg' }),
      );
    const client = new TmdbClient({
      readAccessToken: 'token',
      language: 'es-CL',
      fallbackLanguages: ['es-ES', 'en-US'],
      fetchImpl,
    });

    await expect(client.findByTitle('Película')).resolves.toMatchObject({
      status: 'found',
      metadata: {
        synopsis: 'Sinopsis en español.',
        posterUrl: 'https://image.tmdb.org/t/p/w780/poster.jpg',
      },
    });
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain('language=es-ES');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
