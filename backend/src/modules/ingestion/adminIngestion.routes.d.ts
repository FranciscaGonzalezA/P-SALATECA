import { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import type { IngestionRepository } from './ingestion.types.js';
import type { MovieMetadataEnricher } from '../metadata/metadata.types.js';
export declare function createAdminIngestionRouter(
  authService: AuthService,
  repository: IngestionRepository,
  metadataEnricher?: MovieMetadataEnricher,
): Router;
