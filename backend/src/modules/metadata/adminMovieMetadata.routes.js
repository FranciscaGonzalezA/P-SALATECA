import { Router } from 'express';
import { z } from 'zod';
import { createAuthenticate, requireRole, requireTrustedOrigin } from '../auth/auth.http.js';
import { TmdbNotConfiguredError } from './adminMovieMetadata.service.js';
import { TmdbRequestError } from './tmdbClient.js';
const positiveIdSchema = z.coerce.number().int().positive();
const resolutionSchema = z.object({ tmdbId: z.number().int().positive() });
export function createAdminMovieMetadataRouter(authService, service) {
  const router = Router();
  router.use('/admin', createAuthenticate(authService), requireRole('admin'));
  router.use('/admin', requireTrustedOrigin);
  router.get('/admin/movie-metadata/pending', async (_request, response) => {
    const body = { data: await service.listPending() };
    response.json(body);
  });
  router.get('/admin/movie-metadata/:id/candidates', async (request, response) => {
    const movieId = positiveIdSchema.safeParse(request.params.id);
    const query = z.string().trim().max(255).optional().safeParse(request.query.query);
    if (!movieId.success || !query.success) {
      response.status(400).json({
        error: { code: 'invalid_parameters', message: 'La búsqueda de TMDB no es válida.' },
      });
      return;
    }
    try {
      const candidates = await service.searchCandidates(movieId.data, query.data);
      if (!candidates) {
        response.status(409).json({
          error: {
            code: 'movie_already_resolved',
            message: 'La película no existe o ya fue vinculada con TMDB.',
          },
        });
        return;
      }
      const body = { data: candidates };
      response.json(body);
    } catch (error) {
      if (error instanceof TmdbNotConfiguredError) {
        response.status(503).json({
          error: { code: 'tmdb_not_configured', message: error.message },
        });
        return;
      }
      if (error instanceof TmdbRequestError) {
        response.status(502).json({
          error: { code: 'tmdb_unavailable', message: error.message },
        });
        return;
      }
      throw error;
    }
  });
  router.patch('/admin/movie-metadata/:id', async (request, response) => {
    const movieId = positiveIdSchema.safeParse(request.params.id);
    const input = resolutionSchema.safeParse(request.body);
    if (!movieId.success || !input.success) {
      response.status(400).json({
        error: { code: 'invalid_parameters', message: 'Selecciona una película válida de TMDB.' },
      });
      return;
    }
    try {
      const result = await service.resolve(movieId.data, input.data.tmdbId);
      if (result.status === 'movie_not_pending') {
        response.status(409).json({
          error: {
            code: 'movie_already_resolved',
            message: 'La película no existe o ya fue vinculada con TMDB.',
          },
        });
        return;
      }
      if (result.status === 'candidate_not_found') {
        response.status(404).json({
          error: { code: 'tmdb_movie_not_found', message: 'La película ya no existe en TMDB.' },
        });
        return;
      }
      const body = { data: result };
      response.json(body);
    } catch (error) {
      if (error instanceof TmdbNotConfiguredError) {
        response.status(503).json({
          error: { code: 'tmdb_not_configured', message: error.message },
        });
        return;
      }
      if (error instanceof TmdbRequestError) {
        response.status(502).json({
          error: { code: 'tmdb_unavailable', message: error.message },
        });
        return;
      }
      throw error;
    }
  });
  return router;
}
