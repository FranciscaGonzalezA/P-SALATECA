import { z } from 'zod';
import type { IngestionValidationIssue, NormalizedScreeningDto } from './ingestion.types.js';

const canonicalKeySchema = z
  .string()
  .trim()
  .regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u);

export const normalizedScreeningSchema = z.object({
  movieTitle: z.string().trim().min(1),
  venueName: z.string().trim().min(1),
  movieKey: canonicalKeySchema,
  venueKey: canonicalKeySchema,
  screeningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  screeningTime: z.string().regex(/^\d{2}:\d{2}$/),
  startsAt: z.string().datetime({ offset: true }),
  sourceTimezone: z.string().trim().min(1),
  sourceUrl: z.string().url().max(2_048),
  sourceType: z.enum(['website', 'calendar', 'social_media', 'manual', 'api']),
  sourceRecordKey: z.string().trim().min(1).optional(),
  capturedAt: z.string().datetime({ offset: true }),
  language: z.string().trim().min(1).optional(),
  format: z.string().trim().min(1).optional(),
  duplicateKey: z.string().trim().min(1),
});

export type ParsedScreeningResult =
  | { success: true; data: NormalizedScreeningDto }
  | { success: false; issues: IngestionValidationIssue[] };

export function parseNormalizedScreening(input: unknown): ParsedScreeningResult {
  const result = normalizedScreeningSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'record',
      code: issue.code,
      message: issue.message,
    })),
  };
}
