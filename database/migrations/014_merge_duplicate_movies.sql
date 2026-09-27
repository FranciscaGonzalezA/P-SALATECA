-- The pre-fix version of findOrCreateMovie (see backend/src/modules/ingestion/
-- mysqlIngestionRepository.ts) inserted a movie keyed only on
-- (canonical_title, COALESCE(release_year, 0)). Once TMDB enrichment filled in
-- release_year for a movie, a later import of the same title without a year
-- did not collide with that row and created a second, "yearless" movie
-- instead of reusing it. This left dozens of titles with two movies rows,
-- each accumulating their own screenings, which the catalog then rendered as
-- duplicate cards. This migration merges every such pair back into a single
-- "keeper" row (the one with the most complete metadata) before the schema
-- can enforce a single row per canonical_title going forward.

CREATE TEMPORARY TABLE dup_movie_merge_map (
  duplicate_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  keeper_id BIGINT UNSIGNED NOT NULL,
  KEY idx_dup_movie_merge_map_keeper (keeper_id)
);

INSERT INTO dup_movie_merge_map (duplicate_id, keeper_id)
SELECT d.id, keeper.keeper_id
FROM movies d
INNER JOIN (
  SELECT
    m.canonical_title,
    (
      SELECT k.id
      FROM movies k
      WHERE k.canonical_title = m.canonical_title
      ORDER BY
        (CASE WHEN k.tmdb_id IS NOT NULL THEN 8 ELSE 0 END)
        + (CASE WHEN k.release_year IS NOT NULL THEN 4 ELSE 0 END)
        + (CASE WHEN k.metadata_synced_at IS NOT NULL THEN 2 ELSE 0 END)
        + (CASE WHEN k.synopsis IS NOT NULL THEN 1 ELSE 0 END) DESC,
        k.id ASC
      LIMIT 1
    ) AS keeper_id
  FROM movies m
  GROUP BY m.canonical_title
) keeper ON keeper.canonical_title = d.canonical_title
WHERE d.id <> keeper.keeper_id;

-- Backfill any field the keeper is missing but a duplicate has, so merging
-- never loses data the keeper's own metadata pass never captured.
UPDATE movies keeper
INNER JOIN dup_movie_merge_map map ON map.keeper_id = keeper.id
INNER JOIN movies dup ON dup.id = map.duplicate_id
SET
  keeper.original_title = COALESCE(keeper.original_title, dup.original_title),
  keeper.duration_minutes = COALESCE(keeper.duration_minutes, dup.duration_minutes),
  keeper.director = COALESCE(keeper.director, dup.director),
  keeper.synopsis = COALESCE(keeper.synopsis, dup.synopsis);

-- Move posters/other assets from the duplicate onto the keeper.
UPDATE content_assets ca
INNER JOIN dup_movie_merge_map map ON map.duplicate_id = ca.movie_id
SET ca.movie_id = map.keeper_id;

-- Drop duplicate screenings that would otherwise collide with a screening
-- the keeper already has for the same venue and start time.
DELETE dup_s
FROM screenings dup_s
INNER JOIN dup_movie_merge_map map ON map.duplicate_id = dup_s.movie_id
INNER JOIN screenings keeper_s
  ON keeper_s.movie_id = map.keeper_id
  AND keeper_s.venue_id = dup_s.venue_id
  AND keeper_s.starts_at = dup_s.starts_at;

-- Re-point the remaining screenings onto the keeper.
UPDATE screenings dup_s
INNER JOIN dup_movie_merge_map map ON map.duplicate_id = dup_s.movie_id
SET dup_s.movie_id = map.keeper_id;

-- Drop duplicate genre links the keeper already has, then re-point the rest.
DELETE dup_mg
FROM movie_genres dup_mg
INNER JOIN dup_movie_merge_map map ON map.duplicate_id = dup_mg.movie_id
INNER JOIN movie_genres keeper_mg
  ON keeper_mg.movie_id = map.keeper_id
  AND keeper_mg.genre_id = dup_mg.genre_id;

UPDATE movie_genres dup_mg
INNER JOIN dup_movie_merge_map map ON map.duplicate_id = dup_mg.movie_id
SET dup_mg.movie_id = map.keeper_id;

-- Every reference has been moved or reconciled; the duplicate rows are safe
-- to delete.
DELETE m
FROM movies m
INNER JOIN dup_movie_merge_map map ON map.duplicate_id = m.id;

DROP TEMPORARY TABLE dup_movie_merge_map;
