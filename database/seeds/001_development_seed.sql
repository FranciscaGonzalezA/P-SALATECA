INSERT INTO sources (name, source_type, base_url)
VALUES ('Fuente de demostración', 'manual', 'https://example.com/cine-arte-demo')
ON DUPLICATE KEY UPDATE name = VALUES(name), source_type = VALUES(source_type);

INSERT INTO venues (name, canonical_name, address, municipality, website_url)
VALUES (
  'Sala de demostración',
  'sala-de-demostracion',
  'Dirección de ejemplo 123',
  'Santiago',
  'https://example.com/sala-demo'
)
ON DUPLICATE KEY UPDATE name = VALUES(name), municipality = VALUES(municipality);

INSERT INTO genres (name, slug)
VALUES
  ('Documental', 'documental'),
  ('Drama', 'drama'),
  ('Experimental', 'experimental'),
  ('Animación', 'animacion'),
  ('Cine chileno', 'cine-chileno')
ON DUPLICATE KEY UPDATE name = VALUES(name);
