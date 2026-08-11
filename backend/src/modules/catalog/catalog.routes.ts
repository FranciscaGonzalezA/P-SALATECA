import type {
  ApiErrorResponse,
  ApiResponse,
  GenreDto,
  MovieDetailDto,
  PaginatedApiResponse,
  ScreeningDto,
  VenueDto,
} from '@salateca/contracts';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { catalogFiltersSchema, movieIdSchema } from './catalog.schemas.js';
import { CatalogService } from './catalog.service.js';
import type { CatalogFilters } from './catalog.types.js';
import { MysqlCatalogRepository } from './mysqlCatalogRepository.js';

function validationError(error: ZodError): ApiErrorResponse {
  const fields: Record<string, string[]> = {};

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

function parseMovieId(request: Request, response: Response): number | null {
  const result = movieIdSchema.safeParse(request.params.id);
  if (!result.success) {
    response.status(400).json(validationError(result.error));
    return null;
  }
  return result.data;
}

export function createCatalogRouter(
  service: CatalogService = new CatalogService(new MysqlCatalogRepository()),
): Router {
  const router = Router();

  router.get('/cartelera', async (request, response) => {
    const parsed = catalogFiltersSchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json(validationError(parsed.error));
      return;
    }

    const startedAt = Date.now();
    const query = parsed.data;
    const filters: CatalogFilters = {
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
    const body: PaginatedApiResponse<(typeof result.items)[number][]> = {
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

    const body: ApiResponse<ScreeningDto[]> = {
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
      const body: ApiErrorResponse = {
        error: {
          code: 'movie_not_found',
          message: 'La película solicitada no existe.',
        },
      };
      response.status(404).json(body);
      return;
    }

    const body: ApiResponse<MovieDetailDto> = { data: movie };
    response.json(body);
  });

  router.get('/salas', async (_request, response) => {
    const body: ApiResponse<VenueDto[]> = { data: await service.listVenues() };
    response.json(body);
  });

  router.get('/generos', async (_request, response) => {
    const body: ApiResponse<GenreDto[]> = { data: await service.listGenres() };
    response.json(body);
  });

  return router;
}
