import { z } from 'zod';
import type { IngestionValidationIssue, NormalizedScreeningDto } from './ingestion.types.js';
export declare const normalizedScreeningSchema: z.ZodObject<
  {
    stableId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{ scheduled: 'scheduled'; cancelled: 'cancelled' }>>;
    movieTitle: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    venueName: z.ZodString;
    movieKey: z.ZodString;
    venueKey: z.ZodString;
    screeningDate: z.ZodString;
    screeningTime: z.ZodString;
    startsAt: z.ZodString;
    sourceTimezone: z.ZodString;
    sourceUrl: z.ZodString;
    sourceType: z.ZodEnum<{
      website: 'website';
      calendar: 'calendar';
      social_media: 'social_media';
      manual: 'manual';
      api: 'api';
    }>;
    sourceRecordKey: z.ZodOptional<z.ZodString>;
    capturedAt: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodString>;
    duplicateKey: z.ZodString;
  },
  z.core.$strip
>;
export type ParsedScreeningResult =
  | {
      success: true;
      data: NormalizedScreeningDto;
    }
  | {
      success: false;
      issues: IngestionValidationIssue[];
    };
export declare function parseNormalizedScreening(input: unknown): ParsedScreeningResult;
