export { type SourceConnector } from './connectors/sourceConnector.js';
export { createDefaultConnectors } from './connectors/defaultConnectors.js';
export { CinetecaConnector } from './connectors/cinetecaConnector.js';
export { ElBiografoConnector } from './connectors/elBiografoConnector.js';
export { M100Connector } from './connectors/m100Connector.js';
export { NormandieConnector } from './connectors/normandieConnector.js';
export { SalaKConnector } from './connectors/salaKConnector.js';
export { FetchHttpClient, HttpRequestError } from './http/httpClient.js';
export type { HttpClient, HttpResponse } from './http/httpClient.js';
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
