import type { RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env.js';
import { MovieMetadataService } from '../modules/metadata/movieMetadata.service.js';
import { MysqlMovieMetadataRepository } from '../modules/metadata/mysqlMovieMetadataRepository.js';
import { TmdbClient } from '../modules/metadata/tmdbClient.js';
import { databasePool } from './pool.js';

interface MovieTargetRow extends RowDataPacket {
  title: string;
  canonical_title: string;
}

function usableCredential(value: string | undefined): string | undefined {
  return value && !value.startsWith('replace_with_') ? value : undefined;
}

const readAccessToken = usableCredential(env.TMDB_READ_ACCESS_TOKEN ?? env.TMDB_API_TOKEN);
const apiKey = usableCredential(env.TMDB_API_KEY);

if (!readAccessToken && !apiKey) {
  throw new Error('TMDB no está configurado; define TMDB_READ_ACCESS_TOKEN o TMDB_API_KEY.');
}

try {
  const [rows] = await databasePool.execute<MovieTargetRow[]>(`
    SELECT DISTINCT m.title, m.canonical_title
    FROM movies m
    INNER JOIN screenings s ON s.movie_id = m.id
    INNER JOIN venues v ON v.id = s.venue_id
    WHERE
      m.content_type = 'movie'
      AND s.status = 'scheduled'
      AND s.screening_date >= CURRENT_DATE()
      AND v.region_code = 'CL-RM'
      AND (
        m.tmdb_vote_average IS NULL
        OR m.tmdb_vote_count IS NULL
        OR m.tmdb_popularity IS NULL
        OR m.metadata_synced_at < CURRENT_TIMESTAMP(3) - INTERVAL 7 DAY
      )
    ORDER BY m.title
  `);

  const service = new MovieMetadataService(
    new MysqlMovieMetadataRepository(databasePool),
    new TmdbClient({
      readAccessToken,
      apiKey,
      language: env.TMDB_LANGUAGE,
      timeoutMs: env.TMDB_REQUEST_TIMEOUT_MS,
    }),
  );
  const result = await service.enrichMovies(
    rows.map((row) => ({ title: row.title, canonicalTitle: row.canonical_title })),
  );

  console.info(JSON.stringify(result, null, 2));
} finally {
  await databasePool.end();
}
