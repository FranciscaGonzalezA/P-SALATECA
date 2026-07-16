export { type SourceConnector } from './connectors/sourceConnector.js';
export type { NormalizedScreening, RawScreening, SourceType } from './domain/screening.js';
export {
  createCanonicalKey,
  normalizeScreening,
  normalizeWhitespace,
} from './normalization/normalizeScreening.js';

console.info('Módulo de extracción listo; aún no hay conectores productivos habilitados.');
