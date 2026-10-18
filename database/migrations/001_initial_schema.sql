CREATE TABLE sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  source_type ENUM('website', 'calendar', 'social_media', 'manual', 'api') NOT NULL,
  base_url VARCHAR(2048) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_successful_sync_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sources_base_url (base_url(500))
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE ingestion_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NOT NULL,
  status ENUM('running', 'succeeded', 'partially_succeeded', 'failed') NOT NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  records_found INT UNSIGNED NOT NULL DEFAULT 0,
  records_accepted INT UNSIGNED NOT NULL DEFAULT 0,
  records_rejected INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_ingestion_runs_source_started (source_id, started_at),
  CONSTRAINT fk_ingestion_runs_source
    FOREIGN KEY (source_id) REFERENCES sources (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE staging_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ingestion_run_id BIGINT UNSIGNED NOT NULL,
  source_url VARCHAR(2048) NOT NULL,
  source_record_key VARCHAR(255) NULL,
  raw_payload JSON NOT NULL,
  normalized_payload JSON NULL,
  processing_status ENUM('pending', 'valid', 'rejected') NOT NULL DEFAULT 'pending',
  validation_errors JSON NULL,
  captured_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_staging_status_captured (processing_status, captured_at),
  KEY idx_staging_ingestion_run (ingestion_run_id),
  CONSTRAINT fk_staging_ingestion_run
    FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE venues (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  canonical_name VARCHAR(180) NOT NULL,
  address VARCHAR(255) NULL,
  municipality VARCHAR(120) NULL,
  website_url VARCHAR(2048) NULL,
  instagram_url VARCHAR(2048) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_venues_canonical_name (canonical_name),
  KEY idx_venues_municipality (municipality)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE movies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  canonical_title VARCHAR(255) NOT NULL,
  original_title VARCHAR(255) NULL,
  release_year SMALLINT UNSIGNED NULL,
  duration_minutes SMALLINT UNSIGNED NULL,
  director VARCHAR(255) NULL,
  synopsis TEXT NULL,
  tmdb_id INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_movies_tmdb_id (tmdb_id),
  KEY idx_movies_canonical_title (canonical_title),
  CONSTRAINT chk_movies_release_year
    CHECK (release_year IS NULL OR release_year BETWEEN 1888 AND 2200),
  CONSTRAINT chk_movies_duration
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE genres (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_genres_name (name),
  UNIQUE KEY uq_genres_slug (slug)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE movie_genres (
  movie_id BIGINT UNSIGNED NOT NULL,
  genre_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (movie_id, genre_id),
  CONSTRAINT fk_movie_genres_movie
    FOREIGN KEY (movie_id) REFERENCES movies (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_movie_genres_genre
    FOREIGN KEY (genre_id) REFERENCES genres (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE screenings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  venue_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  staging_record_id BIGINT UNSIGNED NULL,
  starts_at DATETIME(3) NOT NULL COMMENT 'UTC',
  source_timezone VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
  language VARCHAR(80) NULL,
  screening_format VARCHAR(80) NULL,
  official_url VARCHAR(2048) NOT NULL,
  status ENUM('scheduled', 'cancelled', 'finished') NOT NULL DEFAULT 'scheduled',
  captured_at DATETIME(3) NOT NULL,
  published_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_screenings_identity (movie_id, venue_id, starts_at),
  KEY idx_screenings_starts_at (starts_at),
  KEY idx_screenings_venue_starts (venue_id, starts_at),
  KEY idx_screenings_source (source_id),
  CONSTRAINT fk_screenings_movie
    FOREIGN KEY (movie_id) REFERENCES movies (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_screenings_venue
    FOREIGN KEY (venue_id) REFERENCES venues (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_screenings_source
    FOREIGN KEY (source_id) REFERENCES sources (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_screenings_staging_record
    FOREIGN KEY (staging_record_id) REFERENCES staging_records (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE content_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NULL,
  venue_id BIGINT UNSIGNED NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  asset_type ENUM('poster', 'image', 'synopsis', 'trailer', 'logo') NOT NULL,
  original_url VARCHAR(2048) NOT NULL,
  rights_status ENUM('authorized', 'compatible_license', 'link_only', 'unknown') NOT NULL,
  rights_holder VARCHAR(255) NULL,
  local_storage_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  captured_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_content_assets_movie (movie_id),
  KEY idx_content_assets_venue (venue_id),
  CONSTRAINT chk_content_assets_owner
    CHECK (movie_id IS NOT NULL OR venue_id IS NOT NULL),
  CONSTRAINT fk_content_assets_movie
    FOREIGN KEY (movie_id) REFERENCES movies (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_content_assets_venue
    FOREIGN KEY (venue_id) REFERENCES venues (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_content_assets_source
    FOREIGN KEY (source_id) REFERENCES sources (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
