import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  MYSQL_HOST: z.string().min(1).default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
  MYSQL_DATABASE: z.string().min(1).default('cine_arte'),
  MYSQL_USER: z.string().min(1).default('cine_arte_app'),
  MYSQL_PASSWORD: z.string().min(1),
  MYSQL_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Configuración de entorno inválida:\n${issues.join('\n')}`);
}

export const env = result.data;
