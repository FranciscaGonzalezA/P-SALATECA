ALTER TABLE movies
  DROP INDEX uq_movies_canonical_title,
  ADD UNIQUE KEY uq_movies_canonical_title_release_year (
    canonical_title,
    (COALESCE(release_year, 0))
  );
