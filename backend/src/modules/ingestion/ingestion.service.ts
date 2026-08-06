import { parseNormalizedScreening } from './ingestion.schema.js';
import type {
  IngestionRepository,
  IngestionRequest,
  IngestionResult,
  IngestionRunStatus,
  IngestionSummary,
  IngestionValidationIssue,
} from './ingestion.types.js';

function resolveRunStatus(summary: IngestionSummary): IngestionRunStatus {
  const published = summary.inserted + summary.updated + summary.duplicates;

  if (summary.rejected === 0) {
    return 'succeeded';
  }

  return published > 0 ? 'partially_succeeded' : 'failed';
}

function databaseIssue(error: unknown): IngestionValidationIssue {
  return {
    field: 'record',
    code: 'persistence_error',
    message: error instanceof Error ? error.message : 'No fue posible publicar el registro.',
  };
}

export async function ingestScreenings(
  repository: IngestionRepository,
  request: IngestionRequest,
): Promise<IngestionResult> {
  return repository.withTransaction(async (transaction) => {
    const sourceId = await transaction.upsertSource(request.source);
    const runId = await transaction.createRun(sourceId);
    const summary: IngestionSummary = {
      processed: request.records.length,
      inserted: 0,
      updated: 0,
      rejected: 0,
      duplicates: 0,
    };

    for (const [index, candidate] of request.records.entries()) {
      const parsed = parseNormalizedScreening(candidate.normalizedPayload);
      const stagingRecordId = await transaction.stageRecord(
        runId,
        candidate,
        parsed.success ? parsed.data : null,
      );

      if (!parsed.success) {
        summary.rejected += 1;
        await transaction.recordErrors(runId, stagingRecordId, parsed.issues);
        await transaction.markStaging(stagingRecordId, 'rejected', parsed.issues);
        continue;
      }

      try {
        const outcome = await transaction.runInSavepoint(`screening_${index}`, () =>
          transaction.publishScreening(sourceId, stagingRecordId, parsed.data),
        );

        summary[outcome === 'duplicate' ? 'duplicates' : outcome] += 1;
        await transaction.markStaging(
          stagingRecordId,
          outcome === 'duplicate' ? 'duplicate' : 'valid',
        );
      } catch (error) {
        const issue = databaseIssue(error);
        summary.rejected += 1;
        await transaction.recordErrors(runId, stagingRecordId, [issue]);
        await transaction.markStaging(stagingRecordId, 'rejected', [issue]);
      }
    }

    const status = resolveRunStatus(summary);
    await transaction.finishRun(runId, status, summary);

    return {
      runId,
      status,
      ...summary,
    };
  });
}
