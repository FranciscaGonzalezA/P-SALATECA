import type { RawScreening } from '../domain/screening.js';
import { safeNormalizeScreening } from '../normalization/normalizeScreening.js';
import type { ConnectorRunResult } from './collectionRunner.js';

interface IngestionCandidate {
  rawPayload: RawScreening;
  normalizedPayload: unknown;
  rowNumber: number;
  validationIssues?: Array<{ field: string; code: string; message: string }>;
}

export interface IngestionResult {
  runId: number;
  status: 'succeeded' | 'partially_succeeded' | 'failed';
  processed: number;
  inserted: number;
  updated: number;
  rejected: number;
  duplicates: number;
}

export class BackendPublisher {
  constructor(
    private readonly apiBaseUrl: URL,
    private readonly token: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async publish(source: ConnectorRunResult): Promise<IngestionResult> {
    const records: IngestionCandidate[] = source.rawRecords.map((rawPayload, index) => {
      const normalized = safeNormalizeScreening(rawPayload);
      return normalized.success
        ? { rawPayload, normalizedPayload: normalized.data, rowNumber: index + 1 }
        : {
            rawPayload,
            normalizedPayload: {},
            rowNumber: index + 1,
            validationIssues: normalized.rejection.issues,
          };
    });
    const endpoint = new URL(
      'internal/scraper/ingest',
      `${this.apiBaseUrl.href.replace(/\/?$/, '/')}`,
    );
    const response = await this.fetchImplementation(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: { name: source.name, type: source.sourceType, baseUrl: source.sourceUrl },
        records,
      }),
    });
    const body = (await response.json().catch(() => undefined)) as
      { data?: IngestionResult; error?: { message?: string } } | undefined;
    if (!response.ok || !body?.data) {
      throw new Error(
        body?.error?.message ?? `El backend rechazó la ingesta con HTTP ${response.status}.`,
      );
    }
    return body.data;
  }
}
