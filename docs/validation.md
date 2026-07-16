# Validación del inicio técnico

## Coherencia con el informe

La estructura solicitada es adecuada para comenzar, y el cambio de PostgreSQL a MySQL es
técnicamente viable porque el informe exige una base relacional, no una característica exclusiva
de PostgreSQL. Deben actualizarse en el informe la tabla 3.7, la tabla 3.8 y el cronograma donde
se nombra PostgreSQL.

La arquitectura inicial también debe conservar los componentes descritos en el documento:

- conectores de extracción por fuente;
- almacenamiento intermedio o staging;
- normalización y detección de duplicados;
- bitácora y trazabilidad de fuente;
- API desacoplada del frontend;
- caché o última versión válida en una etapa posterior.

## Coherencia con el tablero Kanban

La base preparada contempla las historias visibles:

- KAN-6: esquema relacional de películas, salas, funciones, fuentes y staging;
- KAN-7: módulo `scraper` preparado para cargadores y conectores;
- KAN-10: conectores independientes para fuentes sin sitio web;
- KAN-1: normalización aislada y comprobable;
- KAN-4: variable segura para TMDB y espacio para un conector oficial;
- KAN-8 y KAN-5: frontend React con rutas/vistas por desarrollar;
- KAN-9: base CSS accesible y requisito explícito de contraste, foco y tamaño de texto.

## Observaciones

- No es recomendable extraer Instagram mediante automatización no autorizada. Primero se debe
  validar API, permiso de la sala o carga manual controlada.
- TMDB sirve para enriquecer metadatos de películas, pero no reemplaza la fuente oficial de
  horarios y funciones.
- El modelo conceptual del informe debe ajustarse: `screenings` necesita una relación directa con
  `sources`, y género conviene como relación muchos-a-muchos porque una película puede tener
  varios géneros.
