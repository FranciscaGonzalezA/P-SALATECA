import { parseNormalizedScreening } from './ingestion.schema.js';
function resolveRunStatus(summary) {
  const published = summary.inserted + summary.updated + summary.cancelled + summary.duplicates;
  if (summary.rejected === 0) {
    return 'succeeded';
  }
  return published > 0 ? 'partially_succeeded' : 'failed';
}
function databaseIssue(error) {
  return {
    field: 'record',
    code: 'persistence_error',
    message: error instanceof Error ? error.message : 'No fue posible publicar el registro.',
  };
}
function displayValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function rowErrors(rowNumber, issues) {
  return issues.map((issue) => ({
    ...issue,
    rowNumber,
    value: displayValue(issue.rawValue),
  }));
}
export async function ingestScreenings(repository, request) {
  return repository.withTransaction(async (transaction) => {
    const sourceId = await transaction.upsertSource(request.source);
    const runId = await transaction.createRun(sourceId);
    const summary = {
      processed: request.records.length,
      inserted: 0,
      updated: 0,
      cancelled: 0,
      rejected: 0,
      duplicates: 0,
    };
    const errors = [];
    const synchronizedSourceIds = new Set();
    for (const [index, candidate] of request.records.entries()) {
      const parsed = parseNormalizedScreening(candidate.normalizedPayload);
      const validationIssues = candidate.validationIssues?.length
        ? candidate.validationIssues
        : parsed.success
          ? []
          : parsed.issues;
      const stagingRecordId = await transaction.stageRecord(
        runId,
        candidate,
        validationIssues.length === 0 && parsed.success ? parsed.data : null,
      );
      if (validationIssues.length > 0 || !parsed.success) {
        summary.rejected += 1;
        errors.push(...rowErrors(candidate.rowNumber ?? index + 1, validationIssues));
        await transaction.recordErrors(runId, stagingRecordId, validationIssues);
        await transaction.markStaging(stagingRecordId, 'rejected', validationIssues);
        continue;
      }
      try {
        const outcome = await transaction.runInSavepoint(`screening_${index}`, async () => {
          const publicationSourceId = candidate.source
            ? await transaction.upsertSource(candidate.source)
            : sourceId;
          const publicationOutcome = await transaction.publishScreening(
            publicationSourceId,
            stagingRecordId,
            parsed.data,
          );
          synchronizedSourceIds.add(publicationSourceId);
          return publicationOutcome;
        });
        summary[outcome === 'duplicate' ? 'duplicates' : outcome] += 1;
        await transaction.markStaging(
          stagingRecordId,
          outcome === 'duplicate' ? 'duplicate' : 'valid',
        );
      } catch (error) {
        const issue = databaseIssue(error);
        summary.rejected += 1;
        errors.push(...rowErrors(candidate.rowNumber ?? index + 1, [issue]));
        await transaction.recordErrors(runId, stagingRecordId, [issue]);
        await transaction.markStaging(stagingRecordId, 'rejected', [issue]);
      }
    }
    const status = resolveRunStatus(summary);
    await transaction.finishRun(runId, status, summary, [...synchronizedSourceIds]);
    return {
      runId,
      status,
      ...summary,
      errors,
    };
  });
}
