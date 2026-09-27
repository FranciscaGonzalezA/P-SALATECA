import type {
  GenreDto,
  MovieDetailDto,
  MovieSummaryDto,
  ScreeningDto,
  SourceDto,
  VenueDto,
} from '@salateca/contracts';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { databasePool } from '../../db/pool.js';
import type { CatalogFilters, CatalogPage, CatalogRepository } from './catalog.types.js';

interface CountRow extends RowDataPacket {
  total: number;
}

interface MovieIdRow extends RowDataPacket {
  id: number;
}

interface CatalogRow extends RowDataPacket {
  movie_id: number;
  title: string;
  original_title: string | null;
  release_year: number | null;
  duration_minutes: number | null;
  director: string | null;
  synopsis: string | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  tmdb_popularity: number | null;
  movie_updated_at: string;
  poster_url: string | null;
  genre_id: number | null;
  genre_name: string | null;
  genre_slug: string | null;
  screening_id: number | null;
  screening_date: string | null;
  screening_time: string | null;
  starts_at: string | null;
  language: string | null;
  screening_format: string | null;
  official_url: string | null;
  captured_at: string | null;
  venue_id: number | null;
  venue_name: string | null;
  venue_slug: string | null;
  venue_address: string | null;
  municipality: string | null;
  venue_website_url: string | null;
  source_id: number | null;
  source_name: string | null;
  source_type: SourceDto['type'] | null;
  source_url: string | null;
  last_successful_sync_at: string | null;
}

interface GenreRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
}

interface VenueRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  municipality: string | null;
  website_url: string | null;
}

function mysqlDateTimeToIso(value: string): string {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${normalized.replace(/Z$/, '')}Z`).toISOString();
}

function mapVenue(row: CatalogRow): VenueDto {
  return {
    id: row.venue_id ?? 0,
    name: row.venue_name ?? '',
    slug: row.venue_slug ?? '',
    address: row.venue_address,
    municipality: row.municipality,
    websiteUrl: row.venue_website_url,
  };
}

function mapSource(row: CatalogRow): SourceDto {
  return {
    id: row.source_id ?? 0,
    name: row.source_name ?? '',
    type: row.source_type ?? 'manual',
    url: row.source_url ?? '',
    lastSuccessfulSyncAt: row.last_successful_sync_at
      ? mysqlDateTimeToIso(row.last_successful_sync_at)
      : null,
  };
}

function mapScreening(row: CatalogRow): ScreeningDto | null {
  if (
    row.screening_id === null ||
    row.screening_date === null ||
    row.screening_time === null ||
    row.starts_at === null ||
    row.official_url === null ||
    row.captured_at === null
  ) {
    return null;
  }

  return {
    id: row.screening_id,
    date: row.screening_date,
    time: row.screening_time.slice(0, 5),
    startsAt: mysqlDateTimeToIso(row.starts_at),
    language: row.language,
    format: row.screening_format,
    officialUrl: row.official_url,
    capturedAt: mysqlDateTimeToIso(row.captured_at),
    venue: mapVenue(row),
    source: mapSource(row),
  };
}

function mapMovies(rows: readonly CatalogRow[]): MovieSummaryDto[] {
  const movies = new Map<
    number,
    MovieSummaryDto & { genreIds: Set<number>; screeningIds: Set<number> }
  >();

  for (const row of rows) {
    let movie = movies.get(row.movie_id);

    if (!movie) {
      movie = {
        id: row.movie_id,
        title: row.title,
        originalTitle: row.original_title,
        releaseYear: row.release_year,
        durationMinutes: row.duration_minutes,
        director: row.director,
        synopsis: row.synopsis,
        posterUrl: row.poster_url,
        tmdbRating: row.tmdb_vote_average,
        tmdbVoteCount: row.tmdb_vote_count,
        tmdbPopularity: row.tmdb_popularity,
        genres: [],
        screenings: [],
        genreIds: new Set<number>(),
        screeningIds: new Set<number>(),
      };
      movies.set(row.movie_id, movie);
    }

    if (
      row.genre_id !== null &&
      row.genre_name !== null &&
      row.genre_slug !== null &&
      !movie.genreIds.has(row.genre_id)
    ) {
      movie.genreIds.add(row.genre_id);
      movie.genres.push({
        id: row.genre_id,
        name: row.genre_name,
        slug: row.genre_slug,
      });
    }

    const screening = mapScreening(row);
    if (screening && !movie.screeningIds.has(screening.id)) {
      movie.screeningIds.add(screening.id);
      movie.screenings.push(screening);
    }
  }

  return [...movies.values()].map((movie): MovieSummaryDto => ({
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    releaseYear: movie.releaseYear,
    durationMinutes: movie.durationMinutes,
    director: movie.director,
    synopsis: movie.synopsis,
    posterUrl: movie.posterUrl,
    tmdbRating: movie.tmdbRating,
    tmdbVoteCount: movie.tmdbVoteCount,
    tmdbPopularity: movie.tmdbPopularity,
    genres: movie.genres,
    screenings: movie.screenings,
  }));
}

function buildWhere(filters: CatalogFilters): { sql: string; values: Array<string | number> } {
  const conditions = [
    `s.status = 'scheduled'`,
    `m.content_type = 'movie'`,
    `s.screening_date >= CURRENT_DATE()`,
    `v.region_code = 'CL-RM'`,
  ];
  const values: Array<string | number> = [];

  if (filters.date) {
    conditions.push('s.screening_date = ?');
    values.push(filters.date);
  }

  if (filters.time) {
    conditions.push('TIME_FORMAT(s.screening_time, "%H:%i") = ?');
    values.push(filters.time);
  }

  if (filters.venue) {
    conditions.push('v.canonical_name = ?');
    values.push(filters.venue);
  }

  if (filters.genre) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM movie_genres filter_mg
        INNER JOIN genres filter_g ON filter_g.id = filter_mg.genre_id
        WHERE filter_mg.movie_id = m.id AND filter_g.slug = ?
      )
    `);
    values.push(filters.genre);
  }

  if (filters.search) {
    conditions.push(
      `(
        m.title LIKE CONCAT("%", ?, "%")
        OR m.original_title LIKE CONCAT("%", ?, "%")
        OR m.director LIKE CONCAT("%", ?, "%")
      )`,
    );
    values.push(filters.search, filters.search, filters.search);
  }

  return {
    sql: conditions.join(' AND '),
    values,
  };
}

function buildPagination(page: number, pageSize: number): string {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError('La paginación de cartelera no es válida.');
  }

  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new RangeError('El desplazamiento de cartelera no es válido.');
  }

  // MySQL puede rechazar LIMIT/OFFSET parametrizados en sentencias preparadas.
  // Estos valores son enteros validados por el esquema HTTP y nuevamente aquí.
  return `LIMIT ${pageSize} OFFSET ${offset}`;
}

const catalogSelect = `
  SELECT
    m.id AS movie_id,
    m.title,
    m.original_title,
    m.release_year,
    m.duration_minutes,
    m.director,
    m.synopsis,
    CAST(m.tmdb_vote_average AS DOUBLE) AS tmdb_vote_average,
    m.tmdb_vote_count,
    CAST(m.tmdb_popularity AS DOUBLE) AS tmdb_popularity,
    m.updated_at AS movie_updated_at,
    poster.original_url AS poster_url,
    g.id AS genre_id,
    g.name AS genre_name,
    g.slug AS genre_slug,
    s.id AS screening_id,
    s.screening_date,
    s.screening_time,
    s.starts_at,
    s.language,
    s.screening_format,
    s.official_url,
    s.captured_at,
    v.id AS venue_id,
    v.name AS venue_name,
    v.canonical_name AS venue_slug,
    v.address AS venue_address,
    v.municipality,
    v.website_url AS venue_website_url,
    src.id AS source_id,
    src.name AS source_name,
    src.source_type,
    src.base_url AS source_url,
    src.last_successful_sync_at
  FROM movies m
  LEFT JOIN movie_genres mg ON mg.movie_id = m.id
  LEFT JOIN genres g ON g.id = mg.genre_id
  LEFT JOIN content_assets poster
    ON poster.id = (
      SELECT asset.id
      FROM content_assets asset
      WHERE
        asset.movie_id = m.id
        AND asset.asset_type = 'poster'
        AND asset.rights_status IN ('authorized', 'compatible_license', 'link_only')
      ORDER BY asset.captured_at DESC, asset.id DESC
      LIMIT 1
    )
  LEFT JOIN screenings s
    ON s.movie_id = m.id
    AND s.status = 'scheduled'
    AND s.screening_date >= CURRENT_DATE()
    AND EXISTS (
      SELECT 1
      FROM venues scoped_venue
      WHERE scoped_venue.id = s.venue_id AND scoped_venue.region_code = 'CL-RM'
    )
  LEFT JOIN venues v ON v.id = s.venue_id
  LEFT JOIN sources src ON src.id = s.source_id
`;

export class MysqlCatalogRepository implements CatalogRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async listCatalog(filters: CatalogFilters): Promise<CatalogPage> {
    const pagination = buildPagination(filters.page, filters.pageSize);
    const where = buildWhere(filters);
    const joins = `
      FROM screenings s
      INNER JOIN movies m ON m.id = s.movie_id
      INNER JOIN venues v ON v.id = s.venue_id
    `;
    const [countRows] = await this.pool.execute<CountRow[]>(
      `SELECT COUNT(DISTINCT m.id) AS total ${joins} WHERE ${where.sql}`,
      where.values,
    );
    const total = countRows[0]?.total ?? 0;

    if (total === 0) {
      return { items: [], total: 0 };
    }

    const catalogOrder = (() => {
      if (filters.sort === 'featured') {
        return `
          CASE
            WHEN
              m.tmdb_vote_average IS NULL
              OR m.tmdb_vote_count IS NULL
              OR m.tmdb_vote_count = 0
            THEN 0
            ELSE
              (m.tmdb_vote_count / (m.tmdb_vote_count + 50.0)) * m.tmdb_vote_average
              + (50.0 / (m.tmdb_vote_count + 50.0)) * 5.0
          END DESC,
          COALESCE(m.tmdb_popularity, 0) DESC,
          MIN(s.starts_at),
          m.title
        `;
      }
      if (filters.sort === 'alphabetical-asc') {
        return 'm.title ASC, MIN(s.starts_at)';
      }
      if (filters.sort === 'alphabetical-desc') {
        return 'm.title DESC, MIN(s.starts_at)';
      }
      return 'MIN(s.starts_at), m.title';
    })();
    const [movieIdRows] = await this.pool.execute<MovieIdRow[]>(
      `
        SELECT m.id
        ${joins}
        WHERE ${where.sql}
        GROUP BY m.id, m.title
        ORDER BY ${catalogOrder}
        ${pagination}
      `,
      where.values,
    );
    const movieIds = movieIdRows.map((row) => row.id);
    const placeholders = movieIds.map(() => '?').join(', ');
    const [rows] = await this.pool.execute<CatalogRow[]>(
      `
        ${catalogSelect}
        WHERE m.id IN (${placeholders}) AND ${where.sql}
        ORDER BY s.screening_date, s.screening_time, m.title, g.name
      `,
      [...movieIds, ...where.values],
    );

    const byId = new Map(mapMovies(rows).map((movie) => [movie.id, movie]));
    return {
      items: movieIds.flatMap((id) => {
        const movie = byId.get(id);
        return movie ? [movie] : [];
      }),
      total,
    };
  }

  async findMovie(movieId: number): Promise<MovieDetailDto | null> {
    const [rows] = await this.pool.execute<CatalogRow[]>(
      `
        ${catalogSelect}
        WHERE m.id = ? AND m.content_type = 'movie'
        ORDER BY s.screening_date, s.screening_time, g.name
      `,
      [movieId],
    );
    const movie = mapMovies(rows)[0];

    if (!movie || !rows[0]) {
      return null;
    }

    return {
      ...movie,
      updatedAt: mysqlDateTimeToIso(rows[0].movie_updated_at),
    };
  }

  async listMovieScreenings(movieId: number): Promise<ScreeningDto[]> {
    const [rows] = await this.pool.execute<CatalogRow[]>(
      `
        ${catalogSelect}
        WHERE
          m.id = ?
          AND m.content_type = 'movie'
          AND s.status = 'scheduled'
          AND s.screening_date >= CURRENT_DATE()
        ORDER BY s.screening_date, s.screening_time
      `,
      [movieId],
    );

    return mapMovies(rows)[0]?.screenings ?? [];
  }

  async listVenues(): Promise<VenueDto[]> {
    const [rows] = await this.pool.execute<VenueRow[]>(
      `
        SELECT
          id,
          name,
          canonical_name AS slug,
          address,
          municipality,
          website_url
        FROM venues
        WHERE region_code = 'CL-RM'
        ORDER BY name
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      municipality: row.municipality,
      websiteUrl: row.website_url,
    }));
  }

  async listGenres(): Promise<GenreDto[]> {
    const [rows] = await this.pool.execute<GenreRow[]>(
      `SELECT id, name, slug FROM genres ORDER BY name`,
    );
    return rows;
  }
}
