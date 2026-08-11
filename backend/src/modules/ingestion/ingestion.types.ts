export type IngestionSourceType = 'website' | 'calendar' | 'social_media' | 'manual' | 'api';

export interface IngestionSource {
  name: string;
  type: IngestionSourceType;
  baseUrl: string;
}

export interface IngestionCandidate {
  rawPayload: unknown;
  normalizedPayload: unknown;
  source?: IngestionSource | undefined;
  rowNumber?: number | undefined;
  validationIssues?: readonly IngestionValidationIssue[] | undefined;
}

export interface IngestionRequest {
  source: IngestionSource;
  records: readonly IngestionCandidate[];
}

export interface NormalizedScreeningDto {
  movieTitle: string;
  venueName: string;
  movieKey: string;
  venueKey: string;
  screeningDate: string;
  screeningTime: string;
  startsAt: string;
  sourceTimezone: string;
  sourceUrl: string;
  sourceType: IngestionSourceType;
  sourceRecordKey?: string | undefined;
  capturedAt: string;
  language?: string | undefined;
  format?: string | undefined;
  duplicateKey: string;
}

export interface IngestionValidationIssue {
  field: string;
  code: string;
  message: string;
  rawValue?: unknown;
}

export interface IngestionRowError extends IngestionValidationIssue {
  rowNumber: number;
  value: string | null;
}

export type PublicationOutcome = 'inserted' | 'updated' | 'duplicate';
export type IngestionRunStatus = 'succeeded' | 'partially_succeeded' | 'failed';

export interface IngestionSummary {
  processed: number;
  inserted: number;
  updated: number;
  rejected: number;
  duplicates: number;
}

export interface IngestionResult extends IngestionSummary {
  runId: number;
  status: IngestionRunStatus;
  errors: IngestionRowError[];
}

export interface IngestionTransaction {
  upsertSource(source: IngestionSource): Promise<number>;
  createRun(sourceId: number): Promise<number>;
  stageRecord(
    runId: number,
    candidate: IngestionCandidate,
    normalized: NormalizedScreeningDto | null,
  ): Promise<number>;
  recordErrors(
    runId: number,
    stagingRecordId: number,
    issues: readonly IngestionValidationIssue[],
  ): Promise<void>;
  publishScreening(
    sourceId: number,
    stagingRecordId: number,
    screening: NormalizedScreeningDto,
  ): Promise<PublicationOutcome>;
  markStaging(
    stagingRecordId: number,
    status: 'valid' | 'rejected' | 'duplicate',
    issues?: readonly IngestionValidationIssue[],
  ): Promise<void>;
  runInSavepoint<T>(name: string, operation: () => Promise<T>): Promise<T>;
  finishRun(
    runId: number,
    status: IngestionRunStatus,
    summary: IngestionSummary,
    synchronizedSourceIds: readonly number[],
  ): Promise<void>;
}

export interface IngestionRepository {
  withTransaction<T>(operation: (transaction: IngestionTransaction) => Promise<T>): Promise<T>;
}
