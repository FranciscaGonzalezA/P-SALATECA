import type { IngestionRepository, IngestionRequest, IngestionResult } from './ingestion.types.js';
export declare function ingestScreenings(
  repository: IngestionRepository,
  request: IngestionRequest,
): Promise<IngestionResult>;
