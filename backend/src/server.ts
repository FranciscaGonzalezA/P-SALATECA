import { createApp } from './app.js';
import { env } from './config/env.js';
import { databasePool } from './db/pool.js';
import { AuthService } from './modules/auth/auth.service.js';
import { MysqlAuthRepository } from './modules/auth/mysqlAuthRepository.js';

if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  const authService = new AuthService(new MysqlAuthRepository());
  await authService.bootstrapAdmin(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  console.info(`Administrador inicial sincronizado: ${env.ADMIN_EMAIL}`);
} else {
  console.warn('ADMIN_EMAIL y ADMIN_PASSWORD no están configurados; no se creó un administrador.');
}

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
