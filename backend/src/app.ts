import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createAdminPostsRouter } from './modules/posts/adminPosts.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { MysqlAuthRepository } from './modules/auth/mysqlAuthRepository.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { createAdminIngestionRouter } from './modules/ingestion/adminIngestion.routes.js';
import { createScraperIngestionRouter } from './modules/ingestion/scraperIngestion.routes.js';
import { MysqlIngestionRepository } from './modules/ingestion/mysqlIngestionRepository.js';
import { MovieMetadataService } from './modules/metadata/movieMetadata.service.js';
import { MysqlMovieMetadataRepository } from './modules/metadata/mysqlMovieMetadataRepository.js';
import { TmdbClient } from './modules/metadata/tmdbClient.js';
import { createPostsRouter } from './modules/posts/posts.routes.js';
import { PostsService } from './modules/posts/posts.service.js';
import { MysqlPostsRepository } from './modules/posts/mysqlPostsRepository.js';
import { healthRouter } from './routes/health.js';
import { createAdminVenuesRouter } from './modules/venues/adminVenues.routes.js';
import { AdminVenuesService } from './modules/venues/adminVenues.service.js';
import { MysqlAdminVenuesRepository } from './modules/venues/mysqlAdminVenuesRepository.js';

export function createApp(): Express {
  const app = express();
  const authService = new AuthService(new MysqlAuthRepository());
  const postsService = new PostsService(new MysqlPostsRepository());
  const venuesService = new AdminVenuesService(new MysqlAdminVenuesRepository());
  const tmdbReadAccessToken = usableTmdbCredential(
    env.TMDB_READ_ACCESS_TOKEN ?? env.TMDB_API_TOKEN,
  );
  const tmdbApiKey = usableTmdbCredential(env.TMDB_API_KEY);
  const tmdbClient =
    tmdbReadAccessToken || tmdbApiKey
      ? new TmdbClient({
          readAccessToken: tmdbReadAccessToken,
          apiKey: tmdbApiKey,
          language: env.TMDB_LANGUAGE,
          timeoutMs: env.TMDB_REQUEST_TIMEOUT_MS,
        })
      : undefined;
  const metadataService = tmdbClient
    ? new MovieMetadataService(new MysqlMovieMetadataRepository(), tmdbClient)
    : undefined;

  app.disable('x-powered-by');
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/v1', (_request, response) => {
    response.json({ name: 'Cine Arte API', version: 'v1' });
  });
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1', createAuthRouter(authService));
  app.use('/api/v1', createCatalogRouter());
  app.use('/api/v1', createPostsRouter(postsService));
  app.use('/api/v1', createAdminPostsRouter(authService, postsService));
  app.use('/api/v1', createAdminVenuesRouter(authService, venuesService));
  app.use(
    '/api/v1',
    createAdminIngestionRouter(authService, new MysqlIngestionRepository(), metadataService),
  );
  app.use(
    '/api/v1',
    createScraperIngestionRouter(new MysqlIngestionRepository(), env.SCRAPER_INGEST_TOKEN),
  );

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: 'resource_not_found',
        message: 'El recurso solicitado no existe.',
      },
    });
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;

      const httpError =
        typeof error === 'object' && error !== null
          ? (error as { status?: number; type?: string })
          : undefined;

      if (httpError?.type === 'entity.parse.failed') {
        response.status(400).json({
          error: {
            code: 'invalid_json',
            message: 'El cuerpo de la solicitud no contiene JSON válido.',
          },
        });
        return;
      }

      if (httpError?.type === 'entity.too.large') {
        response.status(413).json({
          error: {
            code: 'payload_too_large',
            message: 'El cuerpo de la solicitud supera el límite permitido.',
          },
        });
        return;
      }

      console.error(error);
      response.status(500).json({
        error: {
          code: 'internal_error',
          message: 'No fue posible completar la solicitud.',
        },
      });
    },
  );

  return app;
}

function usableTmdbCredential(value: string | undefined): string | undefined {
  return value && !value.startsWith('replace_with_') ? value : undefined;
}
