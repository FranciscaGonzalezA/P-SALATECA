import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databasePool } from '../../db/pool.js';
import type {
  MovieMetadata,
  MovieMetadataRepository,
  StoredMovieMetadataState,
} from './metadata.types.js';

interface MovieMetadataRow extends RowDataPacket {
  id: number;
  title: string;
  tmdb_id: number | null;
  original_title: string | null;
  release_year: number | null;
  duration_minutes: number | null;
  director: string | null;
  synopsis: string | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  tmdb_popularity: number | null;
  has_poster: number;
  has_genres: number;
  metadata_synced_at: string | Date | null;
}

interface MovieIdRow extends RowDataPacket {
  id: number;
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .normalize('NFC')
    .toLocaleLowerCase('es-CL')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function mysqlDateTimeToDate(value: string | Date | null): Date | null {
  if (value === null || value instanceof Date) return value;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${normalized.replace(/Z$/, '')}Z`);
}

async function upsertTmdbSource(connection: PoolConnection): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO sources (
        name,
        source_type,
        base_url,
        is_active,
        last_successful_sync_at
      )
      VALUES ('The Movie Database (TMDB)', 'api', 'https://www.themoviedb.org', TRUE, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        source_type = 'api',
        is_active = TRUE,
        last_successful_sync_at = CURRENT_TIMESTAMP(3),
        id = LAST_INSERT_ID(id)
    `,
  );
  return result.insertId;
}

async function saveGenres(
  connection: PoolConnection,
  movieId: number,
  genreNames: readonly string[],
): Promise<void> {
  for (const name of genreNames) {
    const genreSlug = slug(name);
    if (!genreSlug) continue;
    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO genres (name, slug)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          id = LAST_INSERT_ID(id)
      `,
      [name.slice(0, 80), genreSlug],
    );
    await connection.execute(`INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)`, [
      movieId,
      result.insertId,
    ]);
  }
}

async function savePoster(
  connection: PoolConnection,
  movieId: number,
  sourceId: number,
  posterUrl: string | null,
): Promise<void> {
  if (!posterUrl) return;
  await connection.execute(
    `
      INSERT INTO content_assets (
        movie_id,
        source_id,
        asset_type,
        original_url,
        rights_status,
        rights_holder,
        local_storage_allowed,
        captured_at
      )
      SELECT ?, ?, 'poster', ?, 'link_only', 'The Movie Database (TMDB)', FALSE, CURRENT_TIMESTAMP(3)
      WHERE NOT EXISTS (
        SELECT 1
        FROM content_assets
        WHERE movie_id = ? AND asset_type = 'poster' AND original_url = ?
      )
    `,
    [movieId, sourceId, posterUrl, movieId, posterUrl],
  );
}

export class MysqlMovieMetadataRepository implements MovieMetadataRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async findByCanonicalTitle(canonicalTitle: string): Promise<StoredMovieMetadataState | null> {
    const [rows] = await this.pool.execute<MovieMetadataRow[]>(
      `
        SELECT
          m.id,
          m.title,
          m.tmdb_id,
          m.original_title,
          m.release_year,
          m.duration_minutes,
          m.director,
          m.synopsis,
          CAST(m.tmdb_vote_average AS DOUBLE) AS tmdb_vote_average,
          m.tmdb_vote_count,
          CAST(m.tmdb_popularity AS DOUBLE) AS tmdb_popularity,
          m.metadata_synced_at,
          EXISTS (
            SELECT 1 FROM content_assets a
            WHERE a.movie_id = m.id AND a.asset_type = 'poster'
          ) AS has_poster,
          EXISTS (
            SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id
          ) AS has_genres
        FROM movies m
        WHERE m.canonical_title = ?
        LIMIT 1
      `,
      [canonicalTitle],
    );
    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      tmdbId: row.tmdb_id,
      originalTitle: row.original_title,
      releaseYear: row.release_year,
      durationMinutes: row.duration_minutes,
      director: row.director,
      synopsis: row.synopsis,
      tmdbVoteAverage: row.tmdb_vote_average,
      tmdbVoteCount: row.tmdb_vote_count,
      tmdbPopularity: row.tmdb_popularity,
      hasPoster: Boolean(row.has_poster),
      hasGenres: Boolean(row.has_genres),
      metadataSyncedAt: mysqlDateTimeToDate(row.metadata_synced_at),
    };
  }

  async saveMetadata(movieId: number, metadata: MovieMetadata): Promise<void> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    try {
      const [owners] = await connection.execute<MovieIdRow[]>(
        `SELECT id FROM movies WHERE tmdb_id = ? AND id <> ? LIMIT 1`,
        [metadata.tmdbId, movieId],
      );
      const availableTmdbId = owners.length === 0 ? metadata.tmdbId : null;
      await connection.execute(
        `
          UPDATE movies
          SET
            tmdb_id = COALESCE(tmdb_id, ?),
            original_title = COALESCE(original_title, ?),
            release_year = COALESCE(release_year, ?),
            duration_minutes = COALESCE(duration_minutes, ?),
            director = COALESCE(director, ?),
            synopsis = COALESCE(synopsis, ?),
            tmdb_vote_average = COALESCE(?, tmdb_vote_average),
            tmdb_vote_count = COALESCE(?, tmdb_vote_count),
            tmdb_popularity = COALESCE(?, tmdb_popularity),
            metadata_source = 'tmdb',
            metadata_synced_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
        `,
        [
          availableTmdbId,
          metadata.originalTitle,
          metadata.releaseYear,
          metadata.durationMinutes,
          metadata.director,
          metadata.synopsis,
          metadata.tmdbVoteAverage,
          metadata.tmdbVoteCount,
          metadata.tmdbPopularity,
          movieId,
        ],
      );

      const sourceId = await upsertTmdbSource(connection);
      await saveGenres(connection, movieId, metadata.genres);
      await savePoster(connection, movieId, sourceId, metadata.posterUrl);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
