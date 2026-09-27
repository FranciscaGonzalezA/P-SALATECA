import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../.env') });

const optionalEnvironmentValue = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    BACKEND_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
    MYSQL_HOST: z.string().min(1).default('127.0.0.1'),
    MYSQL_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
    MYSQL_DATABASE: z.string().min(1).default('cine_arte'),
    MYSQL_USER: z.string().min(1).default('cine_arte_app'),
    MYSQL_PASSWORD: z.string().min(1),
    MYSQL_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(12).optional(),
    SESSION_DURATION_HOURS: z.coerce.number().int().min(1).max(168).default(8),
    PASSWORD_RESET_TOKEN_MINUTES: z.coerce.number().int().min(10).max(120).default(30),
    PASSWORD_RESET_FROM_EMAIL: optionalEnvironmentValue,
    RESEND_API_KEY: z.preprocess(
      (value) =>
        typeof value === 'string' && (value.trim() === '' || value.startsWith('replace_with_'))
          ? undefined
          : value,
      z.string().min(1).optional(),
    ),
    TMDB_API_KEY: optionalEnvironmentValue,
    TMDB_READ_ACCESS_TOKEN: optionalEnvironmentValue,
    TMDB_API_TOKEN: optionalEnvironmentValue,
    TMDB_LANGUAGE: z.string().trim().min(2).default('es-CL'),
    TMDB_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
    SCRAPER_INGEST_TOKEN: z.preprocess(
      (value) =>
        typeof value === 'string' && (value.trim() === '' || value.startsWith('replace_with_'))
          ? undefined
          : value,
      z.string().min(32).optional(),
    ),
  })
  .superRefine((value, context) => {
    if (Boolean(value.ADMIN_EMAIL) !== Boolean(value.ADMIN_PASSWORD)) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_EMAIL'],
        message: 'ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse juntos.',
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Configuración de entorno inválida:\n${issues.join('\n')}`);
}

export const env = result.data;
