ALTER TABLE posts
  ADD COLUMN display_order BIGINT UNSIGNED NULL AFTER keywords;

UPDATE posts
SET display_order = id;

ALTER TABLE posts
  MODIFY COLUMN display_order BIGINT UNSIGNED NOT NULL;

CREATE INDEX idx_posts_display_order ON posts (display_order, id);
