ALTER TABLE movies
  ADD COLUMN content_type ENUM('movie', 'activity') NOT NULL DEFAULT 'movie' AFTER canonical_title,
  ADD KEY idx_movies_content_type (content_type);

UPDATE movies
SET content_type = 'activity'
WHERE
  canonical_title IN (
    'sin-funcion',
    'funcion-sorpresa',
    'paneles-tematicos',
    'animacion-chilena-hoy',
    'especial-pedro-chaskel',
    'inventada-podcast',
    'showcase-bibie',
    'butterfly-the-crossing',
    'yo-y-la-que-fui-cineforo',
    'la-naturaleza-de-las-cosas-invicibles-cineforo'
  )
  OR canonical_title REGEXP '^(charla|clinica|premiacion|visionado|experiencia-vr)(-|$)'
  OR canonical_title LIKE '%-jornadas-sobre-cine';
