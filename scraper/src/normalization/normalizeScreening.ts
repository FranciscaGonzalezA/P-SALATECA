import { z } from 'zod';
import type { NormalizedScreening, RawScreening } from '../domain/screening.js';

const rawScreeningSchema = z.object({
  movieTitle: z.string().trim().min(1),
  venueName: z.string().trim().min(1),
  startsAt: z.string().datetime({ offset: true }),
  sourceUrl: z.string().url(),
  sourceType: z.enum(['website', 'calendar', 'social_media', 'manual', 'api']),
  language: z.string().trim().min(1).optional(),
  format: z.string().trim().min(1).optional(),
});

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function createCanonicalKey(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeScreening(input: RawScreening): NormalizedScreening {
  const parsed = rawScreeningSchema.parse({
    ...input,
    movieTitle: normalizeWhitespace(input.movieTitle),
    venueName: normalizeWhitespace(input.venueName),
    language: input.language ? normalizeWhitespace(input.language) : undefined,
    format: input.format ? normalizeWhitespace(input.format) : undefined,
  });

  return {
    ...parsed,
    movieKey: createCanonicalKey(parsed.movieTitle),
    venueKey: createCanonicalKey(parsed.venueName),
    capturedAt: new Date().toISOString(),
  };
}
