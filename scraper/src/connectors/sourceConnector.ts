import type { RawScreening, SourceType } from '../domain/screening.js';

export interface SourceConnector {
  readonly name: string;
  readonly type: SourceType;
  readonly sourceUrl: URL;
  collect(): Promise<RawScreening[]>;
}
