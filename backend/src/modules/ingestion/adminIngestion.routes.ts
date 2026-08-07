import type { ApiResponse, ScreeningImportResultDto } from '@salateca/contracts';
import express, { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthenticate, requireRole, requireTrustedOrigin } from '../auth/auth.http.js';
import {
  ExcelScreeningFileError,
  inferExcelIngestionSource,
  parseExcelScreenings,
} from './excelScreeningsParser.js';
import { ingestScreenings } from './ingestion.service.js';
import { parseNormalizedScreening } from './ingestion.schema.js';
import type { IngestionRepository } from './ingestion.types.js';
import { disabledMetadataSummary } from '../metadata/movieMetadata.service.js';
import type { MovieMetadataEnricher, MovieMetadataTarget } from '../metadata/metadata.types.js';

const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function createAdminIngestionRouter(
  authService: AuthService,
  repository: IngestionRepository,
  metadataEnricher?: MovieMetadataEnricher,
): Router {
  const router = Router();
  router.use('/admin', createAuthenticate(authService), requireRole('admin'));
  router.use('/admin', requireTrustedOrigin);

  router.post(
    '/admin/screenings/import',
    express.raw({ type: [xlsxMimeType, 'application/octet-stream'], limit: '10mb' }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        response.status(400).json({
          error: {
            code: 'invalid_import_request',
            message: 'Selecciona un archivo XLSX.',
          },
        });
        return;
      }

      try {
        const records = await parseExcelScreenings(request.body);
        const result = await ingestScreenings(repository, {
          source: inferExcelIngestionSource(records),
          records,
        });
        const targetsByTitle = new Map<string, MovieMetadataTarget>();
        for (const record of records) {
          const parsed = parseNormalizedScreening(record.normalizedPayload);
          if (parsed.success && !targetsByTitle.has(parsed.data.movieKey)) {
            targetsByTitle.set(parsed.data.movieKey, {
              title: parsed.data.movieTitle,
              canonicalTitle: parsed.data.movieKey,
            });
          }
        }
        const targets = [...targetsByTitle.values()];
        const metadata = metadataEnricher
          ? await metadataEnricher.enrichMovies(targets)
          : disabledMetadataSummary(targets.length);
        const body: ApiResponse<ScreeningImportResultDto> = {
          data: { ...result, metadata },
        };
        response.json(body);
      } catch (error) {
        if (error instanceof ExcelScreeningFileError) {
          response.status(400).json({
            error: { code: error.code, message: error.message },
          });
          return;
        }
        throw error;
      }
    },
  );

  return router;
}
