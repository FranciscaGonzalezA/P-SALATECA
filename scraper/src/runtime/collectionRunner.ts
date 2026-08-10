import type { NormalizationBatchResult, RawScreening } from '../domain/screening.js';
import { normalizeScreenings } from '../normalization/normalizeScreening.js';
import type { SourceConnector } from '../connectors/sourceConnector.js';

export interface ConnectorRunResult {
  id: string;
  name: string;
  sourceType: SourceConnector['type'];
  sourceUrl: string;
  status: 'succeeded' | 'failed';
  rawRecords: RawScreening[];
  normalization?: NormalizationBatchResult;
  error?: string;
}

export interface CollectionReport {
  startedAt: string;
  finishedAt: string;
  sources: ConnectorRunResult[];
  summary: {
    attemptedSources: number;
    successfulSources: number;
    failedSources: number;
    rawRecords: number;
    acceptedRecords: number;
    rejectedRecords: number;
    duplicateRecords: number;
  };
}

export async function collectFromConnectors(
  connectors: readonly SourceConnector[],
): Promise<CollectionReport> {
  const startedAt = new Date().toISOString();
  const sources: ConnectorRunResult[] = [];

  for (const connector of connectors) {
    try {
      const rawRecords = await connector.collect();
      sources.push({
        id: connector.id,
        name: connector.name,
        sourceType: connector.type,
        sourceUrl: connector.sourceUrl.href,
        status: 'succeeded',
        rawRecords,
        normalization: normalizeScreenings(rawRecords),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fallo desconocido del conector.';
      console.error(`[scraper:${connector.id}] ${message}`);
      sources.push({
        id: connector.id,
        name: connector.name,
        sourceType: connector.type,
        sourceUrl: connector.sourceUrl.href,
        status: 'failed',
        rawRecords: [],
        error: message,
      });
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    sources,
    summary: {
      attemptedSources: sources.length,
      successfulSources: sources.filter((source) => source.status === 'succeeded').length,
      failedSources: sources.filter((source) => source.status === 'failed').length,
      rawRecords: sources.reduce((total, source) => total + source.rawRecords.length, 0),
      acceptedRecords: sources.reduce((total, source) => total + (source.normalization?.summary.accepted ?? 0), 0),
      rejectedRecords: sources.reduce((total, source) => total + (source.normalization?.summary.rejected ?? 0), 0),
      duplicateRecords: sources.reduce((total, source) => total + (source.normalization?.summary.duplicates ?? 0), 0),
    },
  };
}

export function assertCollectionThresholds(
  report: CollectionReport,
  minimumSuccessfulSources: number,
  minimumAcceptedRecords: number,
): void {
  if (report.summary.successfulSources < minimumSuccessfulSources) {
    throw new Error(
      `Sólo respondieron ${report.summary.successfulSources} fuentes; se requieren al menos ${minimumSuccessfulSources}.`,
    );
  }
  if (report.summary.acceptedRecords < minimumAcceptedRecords) {
    throw new Error(
      `Sólo se obtuvieron ${report.summary.acceptedRecords} funciones válidas; se requieren al menos ${minimumAcceptedRecords}.`,
    );
  }
}
