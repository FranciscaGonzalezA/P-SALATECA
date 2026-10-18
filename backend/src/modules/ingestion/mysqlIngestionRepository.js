import { databasePool } from '../../db/pool.js';
function toJson(value) {
  return JSON.stringify(value ?? null);
}
function utcTimestamp(value) {
  return value instanceof Date
    ? value.getTime()
    : new Date(`${value.replace(' ', 'T')}Z`).getTime();
}
function stagingSourceUrl(candidate) {
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
class MysqlIngestionTransaction {
  connection;
  constructor(connection) {
    this.connection = connection;
  }
  async upsertSource(source) {
    const [result] = await this.connection.execute(
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
  async createRun(sourceId) {
    const [result] = await this.connection.execute(
      `INSERT INTO ingestion_runs (source_id, status) VALUES (?, 'running')`,
      [sourceId],
    );
    return result.insertId;
  }
  async stageRecord(runId, candidate, normalized) {
    const normalizedSourceUrl = normalized?.sourceUrl ?? stagingSourceUrl(candidate);
    const sourceRecordKey = normalized?.sourceRecordKey ?? null;
    const [result] = await this.connection.execute(
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
  async recordErrors(runId, stagingRecordId, issues) {
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
  async publishScreening(sourceId, stagingRecordId, screening) {
    // Resolve the stable identity before looking at the mutable schedule.
    let identified;
    if (screening.stableId) {
      const [matches] = await this.connection.execute(
        'SELECT * FROM screenings WHERE stable_id = ? FOR UPDATE',
        [screening.stableId],
      );
      identified = matches[0];
    }
    if (screening.status === 'cancelled') {
      if (!identified)
        throw new Error('ID funcion desconocido: no se puede cancelar una función inexistente.');
      if (identified.status === 'cancelled') return 'duplicate';
      await this.connection.execute(
        "UPDATE screenings SET status = 'cancelled', staging_record_id = ?, captured_at = ? WHERE id = ?",
        [stagingRecordId, new Date(screening.capturedAt), identified.id],
      );
      return 'cancelled';
    }
    const movieId = await this.findOrCreateMovie(screening);
    const venueId = await this.upsertVenue(screening);
    if (identified && (identified.movie_id !== movieId || identified.venue_id !== venueId)) {
      throw new Error('El ID funcion pertenece a otra película o sala.');
    }
    const [rows] = await this.connection.execute(
      `
        SELECT *
        FROM screenings
        WHERE movie_id = ? AND venue_id = ? AND starts_at = ?
        FOR UPDATE
      `,
      [movieId, venueId, new Date(screening.startsAt)],
    );
    const exact = rows[0];
    if (identified && exact && identified.id !== exact.id) {
      throw new Error('El nuevo horario coincide con otra función existente.');
    }
    if (
      !identified &&
      exact?.stable_id &&
      screening.stableId &&
      exact.stable_id !== screening.stableId
    ) {
      throw new Error('La función ya tiene otro ID funcion.');
    }
    const current = identified ?? exact;
    if (!current) {
      await this.connection.execute(
        `
          INSERT INTO screenings (
            movie_id,
            stable_id,
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          movieId,
          screening.stableId ?? null,
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
      (screening.stableId && current.stable_id !== screening.stableId) ||
      (screening.status && current.status !== screening.status) ||
      utcTimestamp(current.starts_at) !== new Date(screening.startsAt).getTime() ||
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
          stable_id = ?,
          status = ?,
          starts_at = ?,
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
        screening.stableId ?? current.stable_id,
        screening.status ?? current.status,
        new Date(screening.startsAt),
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
  async markStaging(stagingRecordId, status, issues = []) {
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
  async runInSavepoint(name, operation) {
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
  async finishRun(runId, status, summary, synchronizedSourceIds) {
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
        summary.inserted + summary.updated + summary.cancelled,
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
  async findOrCreateMovie(screening) {
    // Excel does not include a release year. Once metadata enrichment fills that
    // field, an INSERT keyed by (canonical_title, release_year) would otherwise
    // create a second, yearless movie on the next import.
    const [existingMovies] = await this.connection.execute(
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
    const [result] = await this.connection.execute(
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
  async upsertVenue(screening) {
    const [result] = await this.connection.execute(
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
export class MysqlIngestionRepository {
  pool;
  constructor(pool = databasePool) {
    this.pool = pool;
  }
  async withTransaction(operation) {
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
