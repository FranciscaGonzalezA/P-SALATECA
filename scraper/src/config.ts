import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv({ path: resolve(process.cwd(), '.env') });
loadDotenv({ path: resolve(process.cwd(), '../.env') });

const optionalSecret = z.preprocess(
  (value) =>
    typeof value === 'string' && (value.trim() === '' || value.startsWith('replace_with_'))
      ? undefined
      : value,
  z.string().min(32).optional(),
);

const booleanValue = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? ['1', 'true', 'yes', 'si', 'sí'].includes(value.toLowerCase())
      : value,
  z.boolean(),
);

const schema = z.object({
  SCRAPER_USER_AGENT: z
    .string()
    .trim()
    .min(1)
    .default('CineArtePlatform/0.1 (contact@example.com)'),
  SCRAPER_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
  SCRAPER_REQUEST_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  SCRAPER_BACKEND_URL: z.string().url().default('http://localhost:3000/api/v1'),
  SCRAPER_INGEST_TOKEN: optionalSecret,
  SCRAPER_MIN_SUCCESSFUL_SOURCES: z.coerce.number().int().min(1).max(12).default(3),
  SCRAPER_MIN_ACCEPTED_RECORDS: z.coerce.number().int().min(1).max(10_000).default(1),
  SCRAPER_SCHEDULE_DAY: z
    .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .default('wednesday'),
  SCRAPER_SCHEDULE_TIME: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('09:00'),
  SCRAPER_SCHEDULE_TIMEZONE: z.string().trim().min(1).default('America/Santiago'),
  SCRAPER_RUN_ON_START: booleanValue.default(false),
  NEXO_INSTAGRAM_ACCESS_TOKEN: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Configuración del scraper inválida:\n${issues.join('\n')}`);
}

try {
  new Intl.DateTimeFormat('en', { timeZone: result.data.SCRAPER_SCHEDULE_TIMEZONE }).format();
} catch {
  throw new Error('SCRAPER_SCHEDULE_TIMEZONE no es una zona horaria válida.');
}

export const scraperEnv = result.data;
