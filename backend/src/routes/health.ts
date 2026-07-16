import { Router } from 'express';
import { databasePool } from '../db/pool.js';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_request, response) => {
  try {
    await databasePool.query('SELECT 1');

    response.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    response.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});
