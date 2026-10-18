import { Router } from 'express';
import { catalogFiltersSchema, movieIdSchema } from './catalog.schemas.js';
import { CatalogService } from './catalog.service.js';
import { MysqlCatalogRepository } from './mysqlCatalogRepository.js';
function validationError(error) {
  const fields = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'request';
    fields[field] = [...(fields[field] ?? []), issue.message];
  }
  return {
    error: {
      code: 'invalid_parameters',
      message: 'Uno o más parámetros no son válidos.',
      fields,
    },
  };
}
function parseMovieId(request, response) {
  const result = movieIdSchema.safeParse(request.params.id);
  if (!result.success) {
    response.status(400).json(validationError(result.error));
    return null;
  }
  return result.data;
}
export function createCatalogRouter(service = new CatalogService(new MysqlCatalogRepository())) {
  const router = Router();
  router.get('/cartelera', async (request, response) => {
    const parsed = catalogFiltersSchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json(validationError(parsed.error));
      return;
    }
    const startedAt = Date.now();
    const query = parsed.data;
    const filters = {
      ...(query.fecha ? { date: query.fecha } : {}),
      ...(query.horario ? { time: query.horario } : {}),
      ...(query.sala ? { venue: query.sala } : {}),
      ...(query.genero ? { genre: query.genero } : {}),
      ...(query.buscar ? { search: query.buscar } : {}),
      sort:
        query.orden === 'destacados'
          ? 'featured'
          : query.orden === 'alfabetico_asc'
            ? 'alphabetical-asc'
            : query.orden === 'alfabetico_desc'
              ? 'alphabetical-desc'
              : 'upcoming',
      page: query.pagina,
      pageSize: query.limite,
    };
    const result = await service.listCatalog(filters);
    const elapsedMs = Date.now() - startedAt;
    const body = {
      data: result.items,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.pageSize),
        elapsedMs,
      },
    };
    response.setHeader('Server-Timing', `app;dur=${elapsedMs}`);
    response.json(body);
  });
  router.get('/peliculas/:id/funciones', async (request, response) => {
    const movieId = parseMovieId(request, response);
    if (movieId === null) {
      return;
    }
    const body = {
      data: await service.listMovieScreenings(movieId),
    };
    response.json(body);
  });
  router.get('/peliculas/:id', async (request, response) => {
    const movieId = parseMovieId(request, response);
    if (movieId === null) {
      return;
    }
    const movie = await service.findMovie(movieId);
    if (!movie) {
      const body = {
        error: {
          code: 'movie_not_found',
          message: 'La película solicitada no existe.',
        },
      };
      response.status(404).json(body);
      return;
    }
    const body = { data: movie };
    response.json(body);
  });
  router.get('/salas', async (_request, response) => {
    const body = { data: await service.listVenues() };
    response.json(body);
  });
  router.get('/generos', async (_request, response) => {
    const body = { data: await service.listGenres() };
    response.json(body);
  });
  return router;
}
