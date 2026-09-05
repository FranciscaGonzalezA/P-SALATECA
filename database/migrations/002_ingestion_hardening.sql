ALTER TABLE ingestion_runs
  ADD COLUMN records_duplicates INT UNSIGNED NOT NULL DEFAULT 0
  AFTER records_rejected;

ALTER TABLE staging_records
  MODIFY COLUMN processing_status
    ENUM('pending', 'valid', 'rejected', 'duplicate') NOT NULL DEFAULT 'pending';

ALTER TABLE screenings
  ADD COLUMN screening_date DATE NULL AFTER staging_record_id,
  ADD COLUMN screening_time TIME NULL AFTER screening_date,
  ADD KEY idx_screenings_date_time (screening_date, screening_time);

ALTER TABLE movies
  ADD UNIQUE KEY uq_movies_canonical_title (canonical_title);

CREATE TABLE ingestion_errors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ingestion_run_id BIGINT UNSIGNED NOT NULL,
  staging_record_id BIGINT UNSIGNED NULL,
  field_name VARCHAR(120) NULL,
  error_code VARCHAR(80) NOT NULL,
  error_message TEXT NOT NULL,
  raw_value JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ingestion_errors_run (ingestion_run_id),
  KEY idx_ingestion_errors_staging (staging_record_id),
  CONSTRAINT fk_ingestion_errors_run
    FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_ingestion_errors_staging
    FOREIGN KEY (staging_record_id) REFERENCES staging_records (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE movie_genres
  ADD KEY idx_movie_genres_genre_movie (genre_id, movie_id);
