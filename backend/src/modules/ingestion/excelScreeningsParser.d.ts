import type { IngestionCandidate, IngestionSource } from './ingestion.types.js';
export declare class ExcelScreeningFileError extends Error {
  readonly code: string;
  constructor(message: string, code?: string);
}
export declare function inferExcelIngestionSource(
  records: readonly IngestionCandidate[],
): IngestionSource;
export interface ExcelScreeningParserOptions {
  timezone?: string;
  now?: () => Date;
}
export declare function parseExcelScreenings(
  buffer: Buffer,
  options?: ExcelScreeningParserOptions,
): Promise<IngestionCandidate[]>;
