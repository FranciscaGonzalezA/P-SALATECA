import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCatalogRouter } from './catalog.routes.js';
import { CatalogService } from './catalog.service.js';
import type { CatalogRepository } from './catalog.types.js';

const movie = {
  id: 7,
  title: 'La casa lobo',
  originalTitle: null,
  releaseYear: 2018,
  durationMinutes: 75,
  director: 'Cristóbal León y Joaquín Cociña',
  synopsis: null,
  posterUrl: null,
  tmdbRating: 7.5,
  tmdbVoteCount: 200,
  tmdbPopularity: 15,
  genres: [{ id: 1, name: 'Animación', slug: 'animacion' }],
  screenings: [],
  updatedAt: '2026-07-27T12:00:00.000Z',
};

function createRepository(): CatalogRepository {
  return {
    listCatalog: vi.fn().mockResolvedValue({ items: [movie], total: 13 }),
    findMovie: vi.fn().mockResolvedValue(movie),
    listMovieScreenings: vi.fn().mockResolvedValue([]),
    listVenues: vi.fn().mockResolvedValue([{ id: 1, name: 'Sala K', slug: 'sala-k' }]),
    listGenres: vi.fn().mockResolvedValue([{ id: 1, name: 'Animación', slug: 'animacion' }]),
  } as unknown as CatalogRepository;
}

describe('createCatalogRouter', () => {
  let repository: CatalogRepository;
  let app: express.Express;

  beforeEach(() => {
    repository = createRepository();
    app = express();
    app.use(createCatalogRouter(new CatalogService(repository)));
  });

  it('valida, traduce y pagina los filtros de cartelera', async () => {
    const response = await request(app).get(
      '/cartelera?fecha=2026-08-01&horario=20%3A00&sala=sala-k&genero=animacion&buscar=lobo&pagina=2&limite=6',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([movie]);
    expect(response.body.meta).toMatchObject({
      page: 2,
      pageSize: 6,
      total: 13,
      totalPages: 3,
    });
    expect(response.headers['server-timing']).toMatch(/^app;dur=\d+$/);
    expect(repository.listCatalog).toHaveBeenCalledWith({
      date: '2026-08-01',
      time: '20:00',
      venue: 'sala-k',
      genre: 'animacion',
      search: 'lobo',
      sort: 'upcoming',
      page: 2,
      pageSize: 6,
    });
  });

  it('traduce el orden público de destacados al criterio interno', async () => {
    await request(app).get('/cartelera?orden=destacados&limite=3');

    expect(repository.listCatalog).toHaveBeenCalledWith({
      sort: 'featured',
      page: 1,
      pageSize: 3,
    });
  });

  it('devuelve errores de parámetros por campo', async () => {
    const response = await request(app).get('/cartelera?fecha=2026-02-30&limite=99');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'invalid_parameters' });
    expect(response.body.error.fields).toHaveProperty('fecha');
    expect(response.body.error.fields).toHaveProperty('limite');
    expect(repository.listCatalog).not.toHaveBeenCalled();
  });

  it('rechaza identificadores inválidos y distingue películas ausentes', async () => {
    expect((await request(app).get('/peliculas/no-numero')).status).toBe(400);
    vi.mocked(repository.findMovie).mockResolvedValueOnce(null);

    const response = await request(app).get('/peliculas/999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('movie_not_found');
  });

  it('publica detalle, funciones, salas y géneros con el contrato común', async () => {
    const [detail, screenings, venues, genres] = await Promise.all([
      request(app).get('/peliculas/7'),
      request(app).get('/peliculas/7/funciones'),
      request(app).get('/salas'),
      request(app).get('/generos'),
    ]);

    expect(detail.body).toEqual({ data: movie });
    expect(screenings.body).toEqual({ data: [] });
    expect(venues.body.data[0].slug).toBe('sala-k');
    expect(genres.body.data[0].slug).toBe('animacion');
  });
});
