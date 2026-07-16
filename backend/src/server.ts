import { createApp } from './app.js';
import { env } from './config/env.js';
import { databasePool } from './db/pool.js';

const app = createApp();
const server = app.listen(env.BACKEND_PORT, () => {
  console.info(`Cine Arte API disponible en http://localhost:${env.BACKEND_PORT}/api/v1`);
});

async function shutdown(signal: string) {
  console.info(`${signal} recibido; cerrando servicios.`);
  server.close(async () => {
    await databasePool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
