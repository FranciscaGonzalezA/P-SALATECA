-- Remove only screenings that are exact logical duplicates: same normalized
-- movie title, venue and UTC start time. Prefer the row attached to the movie
-- with the most complete metadata, then the oldest screening as a stable tie-breaker.
DELETE duplicate_screening
FROM screenings AS duplicate_screening
INNER JOIN movies AS duplicate_movie
  ON duplicate_movie.id = duplicate_screening.movie_id
INNER JOIN screenings AS keeper_screening
  ON keeper_screening.venue_id = duplicate_screening.venue_id
  AND keeper_screening.starts_at = duplicate_screening.starts_at
  AND keeper_screening.id <> duplicate_screening.id
INNER JOIN movies AS keeper_movie
  ON keeper_movie.id = keeper_screening.movie_id
  AND keeper_movie.canonical_title = duplicate_movie.canonical_title
WHERE
  (
    (CASE WHEN keeper_movie.tmdb_id IS NOT NULL THEN 8 ELSE 0 END)
    + (CASE WHEN keeper_movie.release_year IS NOT NULL THEN 4 ELSE 0 END)
    + (CASE WHEN keeper_movie.metadata_synced_at IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN keeper_movie.synopsis IS NOT NULL THEN 1 ELSE 0 END)
  ) > (
    (CASE WHEN duplicate_movie.tmdb_id IS NOT NULL THEN 8 ELSE 0 END)
    + (CASE WHEN duplicate_movie.release_year IS NOT NULL THEN 4 ELSE 0 END)
    + (CASE WHEN duplicate_movie.metadata_synced_at IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN duplicate_movie.synopsis IS NOT NULL THEN 1 ELSE 0 END)
  )
  OR (
    (
      (CASE WHEN keeper_movie.tmdb_id IS NOT NULL THEN 8 ELSE 0 END)
      + (CASE WHEN keeper_movie.release_year IS NOT NULL THEN 4 ELSE 0 END)
      + (CASE WHEN keeper_movie.metadata_synced_at IS NOT NULL THEN 2 ELSE 0 END)
      + (CASE WHEN keeper_movie.synopsis IS NOT NULL THEN 1 ELSE 0 END)
    ) = (
      (CASE WHEN duplicate_movie.tmdb_id IS NOT NULL THEN 8 ELSE 0 END)
      + (CASE WHEN duplicate_movie.release_year IS NOT NULL THEN 4 ELSE 0 END)
      + (CASE WHEN duplicate_movie.metadata_synced_at IS NOT NULL THEN 2 ELSE 0 END)
      + (CASE WHEN duplicate_movie.synopsis IS NOT NULL THEN 1 ELSE 0 END)
    )
    AND keeper_screening.id < duplicate_screening.id
  );
