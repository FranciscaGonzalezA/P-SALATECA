export { type SourceConnector } from './connectors/sourceConnector.js';
export type {
  DuplicateScreening,
  NormalizationBatchResult,
  NormalizationBatchSummary,
  NormalizationIssue,
  NormalizationIssueCode,
  NormalizedScreening,
  RawScreening,
  RejectedScreening,
  SourceType,
} from './domain/screening.js';
export {
  createCanonicalKey,
  normalizeDate,
  normalizeScreening,
  normalizeScreenings,
  normalizeTime,
  normalizeWhitespace,
  safeNormalizeScreening,
  ScreeningNormalizationError,
} from './normalization/normalizeScreening.js';
export type {
  NormalizationOptions,
  SafeNormalizationResult,
} from './normalization/normalizeScreening.js';

console.info('Módulo de extracción listo; aún no hay conectores productivos habilitados.');
