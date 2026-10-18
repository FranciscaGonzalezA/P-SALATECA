ALTER TABLE movies
  ADD COLUMN tmdb_vote_average DECIMAL(4,2) NULL AFTER metadata_synced_at,
  ADD COLUMN tmdb_vote_count INT UNSIGNED NULL AFTER tmdb_vote_average,
  ADD COLUMN tmdb_popularity DECIMAL(12,4) NULL AFTER tmdb_vote_count,
  ADD KEY idx_movies_tmdb_ranking (tmdb_vote_count, tmdb_vote_average, tmdb_popularity);
