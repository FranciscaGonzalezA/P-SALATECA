import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { createPostsRouter } from './modules/posts/posts.routes.js';
import { healthRouter } from './routes/health.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/v1', (_request, response) => {
    response.json({ name: 'Cine Arte API', version: 'v1' });
  });
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1', createCatalogRouter());
  app.use('/api/v1', createPostsRouter());

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
