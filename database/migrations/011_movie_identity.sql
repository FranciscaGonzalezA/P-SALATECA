ALTER TABLE movies
  DROP INDEX uq_movies_canonical_title,
  ADD COLUMN release_year_identity SMALLINT UNSIGNED
    GENERATED ALWAYS AS (COALESCE(release_year, 0)) STORED,
  ADD UNIQUE KEY uq_movies_canonical_title_release_year (
    canonical_title,
    release_year_identity
  );
