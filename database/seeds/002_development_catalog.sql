INSERT INTO venues (name, canonical_name, address, municipality, region_code, website_url)
VALUES
  (
    'Cineteca Nacional de Chile',
    'cineteca-nacional-de-chile',
    'Plaza de la Ciudadanía 26',
    'Santiago',
    'CL-RM',
    'https://www.cclm.cl/cineteca-nacional-de-chile/'
  ),
  (
    'Cine Arte Normandie',
    'cine-arte-normandie',
    'Tarapacá 1181',
    'Santiago',
    'CL-RM',
    'https://normandie.cl/'
  ),
  ('Sala K', 'sala-k', 'Marín 321', 'Providencia', 'CL-RM', NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  address = VALUES(address),
  municipality = VALUES(municipality),
  region_code = VALUES(region_code),
  website_url = VALUES(website_url);

INSERT INTO movies (
  title,
  canonical_title,
  release_year,
  duration_minutes,
  director,
  synopsis
)
VALUES
  (
    'La casa lobo',
    'la-casa-lobo',
    2018,
    75,
    'Cristóbal León y Joaquín Cociña',
    'Una joven escapa de una colonia alemana y se refugia en una casa donde la realidad comienza a transformarse.'
  ),
  (
    'El agente topo',
    'el-agente-topo',
    2020,
    84,
    'Maite Alberdi',
    'Un investigador privado contrata a un hombre mayor para observar desde dentro la vida cotidiana de una residencia.'
  ),
  (
    'Nostalgia de la luz',
    'nostalgia-de-la-luz',
    2010,
    90,
    'Patricio Guzmán',
    'En el desierto de Atacama, astrónomos y familiares buscan respuestas mirando hacia el pasado.'
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  duration_minutes = VALUES(duration_minutes),
  director = VALUES(director),
  synopsis = VALUES(synopsis);

INSERT IGNORE INTO movie_genres (movie_id, genre_id)
SELECT movies.id, genres.id
FROM movies
CROSS JOIN genres
WHERE
  movies.canonical_title = 'la-casa-lobo'
  AND genres.slug IN ('animacion', 'cine-chileno');

INSERT IGNORE INTO movie_genres (movie_id, genre_id)
SELECT movies.id, genres.id
FROM movies
CROSS JOIN genres
WHERE
  movies.canonical_title IN ('el-agente-topo', 'nostalgia-de-la-luz')
  AND genres.slug IN ('documental', 'cine-chileno');

INSERT INTO screenings (
  movie_id,
  venue_id,
  source_id,
  screening_date,
  screening_time,
  starts_at,
  source_timezone,
  language,
  screening_format,
  official_url,
  captured_at
)
SELECT
  movies.id,
  venues.id,
  sources.id,
  '2026-08-01',
  '18:00:00',
  '2026-08-02 00:00:00',
  'America/Santiago',
  'Español',
  '2D',
  'https://www.cclm.cl/cineteca-nacional-de-chile/',
  '2026-07-27 12:00:00'
FROM movies, venues, sources
WHERE
  movies.canonical_title = 'la-casa-lobo'
  AND venues.canonical_name = 'cineteca-nacional-de-chile'
  AND sources.base_url = 'https://example.com/cine-arte-demo'
ON DUPLICATE KEY UPDATE
  official_url = VALUES(official_url),
  captured_at = VALUES(captured_at);

INSERT INTO screenings (
  movie_id,
  venue_id,
  source_id,
  screening_date,
  screening_time,
  starts_at,
  source_timezone,
  language,
  screening_format,
  official_url,
  captured_at
)
SELECT
  movies.id,
  venues.id,
  sources.id,
  '2026-08-01',
  '19:30:00',
  '2026-08-01 23:30:00',
  'America/Santiago',
  'Español',
  '2D',
  'https://normandie.cl/',
  '2026-07-27 12:00:00'
FROM movies, venues, sources
WHERE
  movies.canonical_title = 'el-agente-topo'
  AND venues.canonical_name = 'cine-arte-normandie'
  AND sources.base_url = 'https://example.com/cine-arte-demo'
ON DUPLICATE KEY UPDATE
  official_url = VALUES(official_url),
  captured_at = VALUES(captured_at);

INSERT INTO screenings (
  movie_id,
  venue_id,
  source_id,
  screening_date,
  screening_time,
  starts_at,
  source_timezone,
  language,
  screening_format,
  official_url,
  captured_at
)
SELECT
  movies.id,
  venues.id,
  sources.id,
  '2026-08-02',
  '17:00:00',
  '2026-08-02 21:00:00',
  'America/Santiago',
  'Español',
  '2D',
  'https://example.com/salateca-demo',
  '2026-07-27 12:00:00'
FROM movies, venues, sources
WHERE
  movies.canonical_title = 'nostalgia-de-la-luz'
  AND venues.canonical_name = 'sala-k'
  AND sources.base_url = 'https://example.com/cine-arte-demo'
ON DUPLICATE KEY UPDATE
  official_url = VALUES(official_url),
  captured_at = VALUES(captured_at);
