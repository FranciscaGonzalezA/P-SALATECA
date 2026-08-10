import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { ingestScreenings } from './ingestion.service.js';
import type { IngestionRepository, IngestionValidationIssue } from './ingestion.types.js';

const validationIssueSchema = z.object({
  field: z.string().min(1),
  code: z.string().min(1),
  message: z.string().min(1),
  rawValue: z.unknown().optional(),
});

const requestSchema = z.object({
  source: z.object({
    name: z.string().trim().min(1).max(200),
    type: z.enum(['website', 'calendar', 'social_media', 'manual', 'api']),
    baseUrl: z.string().url().max(2_048),
  }),
  records: z
    .array(
      z.object({
        rawPayload: z.unknown(),
        normalizedPayload: z.unknown(),
        rowNumber: z.number().int().positive().optional(),
        validationIssues: z.array(validationIssueSchema).optional(),
      }),
    )
    .min(1)
    .max(5_000),
});

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function authorized(authorization: string | undefined, secret: string): boolean {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return Boolean(match?.[1] && timingSafeEqual(digest(match[1]), digest(secret)));
}

export function createScraperIngestionRouter(
  repository: IngestionRepository,
  ingestToken: string | undefined,
): Router {
  const router = Router();

  router.post('/internal/scraper/ingest', async (request, response) => {
    if (!ingestToken) {
      response.status(503).json({
        error: {
          code: 'scraper_ingestion_disabled',
          message: 'La ingesta automática del scraper no está habilitada.',
        },
      });
      return;
    }
    if (!authorized(request.get('authorization'), ingestToken)) {
      response.status(401).json({
        error: { code: 'invalid_scraper_token', message: 'La credencial del scraper no es válida.' },
      });
      return;
    }

    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'invalid_scraper_payload',
          message: 'El lote del scraper no cumple el contrato de ingesta.',
          fields: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          })),
        },
      });
      return;
    }

    const result = await ingestScreenings(repository, {
      source: parsed.data.source,
      records: parsed.data.records.map((record) => ({
        rawPayload: record.rawPayload,
        normalizedPayload: record.normalizedPayload,
        ...(record.rowNumber ? { rowNumber: record.rowNumber } : {}),
        ...(record.validationIssues
          ? { validationIssues: record.validationIssues as IngestionValidationIssue[] }
          : {}),
      })),
    });
    response.json({ data: result });
  });

  return router;
}
