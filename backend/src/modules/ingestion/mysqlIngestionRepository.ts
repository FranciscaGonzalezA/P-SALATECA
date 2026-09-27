import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databasePool } from '../../db/pool.js';
import type {
  IngestionCandidate,
  IngestionRepository,
  IngestionRunStatus,
  IngestionSource,
  IngestionSummary,
  IngestionTransaction,
  IngestionValidationIssue,
  NormalizedScreeningDto,
  PublicationOutcome,
} from './ingestion.types.js';

interface ScreeningRow extends RowDataPacket {
  id: number;
  source_id: number;
  official_url: string;
  language: string | null;
  screening_format: string | null;
}

interface MovieIdRow extends RowDataPacket {
  id: number;
}

function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function stagingSourceUrl(candidate: IngestionCandidate): string {
  if (
    typeof candidate.rawPayload === 'object' &&
    candidate.rawPayload !== null &&
    'sourceUrl' in candidate.rawPayload &&
    typeof candidate.rawPayload.sourceUrl === 'string' &&
    candidate.rawPayload.sourceUrl.length <= 2_048
  ) {
    return candidate.rawPayload.sourceUrl;
  }
  return 'about:blank';
}

class MysqlIngestionTransaction implements IngestionTransaction {
  constructor(private readonly connection: PoolConnection) {}

  async upsertSource(source: IngestionSource): Promise<number> {
    const [result] = await this.connection.execute<ResultSetHeader>(
      `
        INSERT INTO sources (name, source_type, base_url, is_active)
        VALUES (?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          source_type = VALUES(source_type),
          is_active = TRUE,
          id = LAST_INSERT_ID(id)
      `,
      [source.name, source.type, source.baseUrl],
    );

    return result.insertId;
  }

  async createRun(sourceId: number): Promise<number> {
    const [result] = await this.connection.execute<ResultSetHeader>(
      `INSERT INTO ingestion_runs (source_id, status) VALUES (?, 'running')`,
      [sourceId],
    );

    return result.insertId;
  }

  async stageRecord(
    runId: number,
    candidate: IngestionCandidate,
    normalized: NormalizedScreeningDto | null,
  ): Promise<number> {
    const normalizedSourceUrl = normalized?.sourceUrl ?? stagingSourceUrl(candidate);
    const sourceRecordKey = normalized?.sourceRecordKey ?? null;

    const [result] = await this.connection.execute<ResultSetHeader>(
      `
        INSERT INTO staging_records (
          ingestion_run_id,
          source_url,
          source_record_key,
          raw_payload,
          normalized_payload,
          processing_status,
          captured_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `,
      [
        runId,
        normalizedSourceUrl,
        sourceRecordKey,
        toJson(candidate.rawPayload),
        toJson(normalized),
        normalized?.capturedAt ? new Date(normalized.capturedAt) : new Date(),
      ],
    );

    return result.insertId;
  }

  async recordErrors(
    runId: number,
    stagingRecordId: number,
    issues: readonly IngestionValidationIssue[],
  ): Promise<void> {
    for (const issue of issues) {
      await this.connection.execute(
        `
          INSERT INTO ingestion_errors (
            ingestion_run_id,
            staging_record_id,
            field_name,
            error_code,
            error_message,
            raw_value
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [runId, stagingRecordId, issue.field, issue.code, issue.message, toJson(issue.rawValue)],
      );
    }
  }

  async publishScreening(
    sourceId: number,
    stagingRecordId: number,
    screening: NormalizedScreeningDto,
  ): Promise<PublicationOutcome> {
    const movieId = await this.findOrCreateMovie(screening);
    const venueId = await this.upsertVenue(screening);
    const [rows] = await this.connection.execute<ScreeningRow[]>(
      `
        SELECT id, source_id, official_url, language, screening_format
        FROM screenings
        WHERE movie_id = ? AND venue_id = ? AND starts_at = ?
        FOR UPDATE
      `,
      [movieId, venueId, new Date(screening.startsAt)],
    );
    const current = rows[0];

    if (!current) {
      await this.connection.execute(
        `
          INSERT INTO screenings (
            movie_id,
            venue_id,
            source_id,
            staging_record_id,
            screening_date,
            screening_time,
            starts_at,
            source_timezone,
            language,
            screening_format,
            official_url,
            captured_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          movieId,
          venueId,
          sourceId,
          stagingRecordId,
          screening.screeningDate,
          screening.screeningTime,
          new Date(screening.startsAt),
          screening.sourceTimezone,
          screening.language ?? null,
          screening.format ?? null,
          screening.sourceUrl,
          new Date(screening.capturedAt),
        ],
      );
      return 'inserted';
    }

    const changed =
      current.source_id !== sourceId ||
      current.official_url !== screening.sourceUrl ||
      current.language !== (screening.language ?? null) ||
      current.screening_format !== (screening.format ?? null);

    if (!changed) {
      return 'duplicate';
    }

    await this.connection.execute(
      `
        UPDATE screenings
        SET
          source_id = ?,
          staging_record_id = ?,
          screening_date = ?,
          screening_time = ?,
          source_timezone = ?,
          language = ?,
          screening_format = ?,
          official_url = ?,
          captured_at = ?
        WHERE id = ?
      `,
      [
        sourceId,
        stagingRecordId,
        screening.screeningDate,
        screening.screeningTime,
        screening.sourceTimezone,
        screening.language ?? null,
        screening.format ?? null,
        screening.sourceUrl,
        new Date(screening.capturedAt),
        current.id,
      ],
    );

    return 'updated';
  }

  async markStaging(
    stagingRecordId: number,
    status: 'valid' | 'rejected' | 'duplicate',
    issues: readonly IngestionValidationIssue[] = [],
  ): Promise<void> {
    await this.connection.execute(
      `
        UPDATE staging_records
        SET
          processing_status = ?,
          validation_errors = ?,
          processed_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
      `,
      [status, toJson(issues), stagingRecordId],
    );
  }

  async runInSavepoint<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (!/^[a-z0-9_]+$/i.test(name)) {
      throw new Error('Nombre de savepoint inválido.');
    }

    await this.connection.query(`SAVEPOINT ${name}`);
    try {
      const result = await operation();
      await this.connection.query(`RELEASE SAVEPOINT ${name}`);
      return result;
    } catch (error) {
      await this.connection.query(`ROLLBACK TO SAVEPOINT ${name}`);
      await this.connection.query(`RELEASE SAVEPOINT ${name}`);
      throw error;
    }
  }

  async finishRun(
    runId: number,
    status: IngestionRunStatus,
    summary: IngestionSummary,
    synchronizedSourceIds: readonly number[],
  ): Promise<void> {
    await this.connection.execute(
      `
        UPDATE ingestion_runs
        SET
          status = ?,
          finished_at = CURRENT_TIMESTAMP(3),
          records_found = ?,
          records_accepted = ?,
          records_rejected = ?,
          records_duplicates = ?
        WHERE id = ?
      `,
      [
        status,
        summary.processed,
        summary.inserted + summary.updated,
        summary.rejected,
        summary.duplicates,
        runId,
      ],
    );

    if (status !== 'failed' && synchronizedSourceIds.length > 0) {
      const placeholders = synchronizedSourceIds.map(() => '?').join(', ');
      await this.connection.execute(
        `
          UPDATE sources
          SET last_successful_sync_at = CURRENT_TIMESTAMP(3)
          WHERE id IN (${placeholders})
        `,
        [...synchronizedSourceIds],
      );
    }
  }

  private async findOrCreateMovie(screening: NormalizedScreeningDto): Promise<number> {
    // Excel does not include a release year. Once metadata enrichment fills that
    // field, an INSERT keyed by (canonical_title, release_year) would otherwise
    // create a second, yearless movie on the next import.
    const [existingMovies] = await this.connection.execute<MovieIdRow[]>(
      `
        SELECT id
        FROM movies
        WHERE canonical_title = ?
        ORDER BY
          tmdb_id IS NULL ASC,
          release_year IS NULL ASC,
          metadata_synced_at IS NULL ASC,
          id ASC
        LIMIT 1
        FOR UPDATE
      `,
      [screening.movieKey],
    );
    const existingMovie = existingMovies[0];
    if (existingMovie) {
      await this.connection.execute(`UPDATE movies SET title = ? WHERE id = ?`, [
        screening.movieTitle,
        existingMovie.id,
      ]);
      return existingMovie.id;
    }

    const [result] = await this.connection.execute<ResultSetHeader>(
      `
        INSERT INTO movies (title, canonical_title)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          id = LAST_INSERT_ID(id)
      `,
      [screening.movieTitle, screening.movieKey],
    );
    return result.insertId;
  }

  private async upsertVenue(screening: NormalizedScreeningDto): Promise<number> {
    const [result] = await this.connection.execute<ResultSetHeader>(
      `
        INSERT INTO venues (name, canonical_name)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          id = LAST_INSERT_ID(id)
      `,
      [screening.venueName, screening.venueKey],
    );
    return result.insertId;
  }
}

export class MysqlIngestionRepository implements IngestionRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async withTransaction<T>(
    operation: (transaction: IngestionTransaction) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      const result = await operation(new MysqlIngestionTransaction(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
