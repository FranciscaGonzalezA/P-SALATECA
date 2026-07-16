import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
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

  app.use((_request, response) => {
    response.status(404).json({ error: 'resource_not_found' });
  });

  return app;
}
