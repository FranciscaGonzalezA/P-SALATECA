-- Optional, global, case-sensitive Excel identifier. Existing rows remain compatible.
ALTER TABLE screenings
  ADD COLUMN stable_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD UNIQUE KEY uq_screenings_stable_id (stable_id);
