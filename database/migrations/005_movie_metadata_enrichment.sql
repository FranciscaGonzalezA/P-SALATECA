ALTER TABLE movies
  ADD COLUMN metadata_source VARCHAR(40) NULL AFTER tmdb_id,
  ADD COLUMN metadata_synced_at DATETIME(3) NULL AFTER metadata_source,
  ADD KEY idx_movies_metadata_pending (metadata_source, metadata_synced_at);
