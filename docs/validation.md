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

## Avance verificado al 27 de julio de 2026

- KAN-1 cuenta con normalización de fechas, horarios, zona horaria, alias, trazabilidad, rechazos
  y duplicados. El lote controlado alcanza una tasa de normalización del 90 %.
- KAN-6 incluye migraciones para staging, ejecuciones, errores, cartelera, géneros, salas, fuentes
  y condición de uso de recursos.
- KAN-7 dispone de un servicio transaccional, savepoint por registro y entrada JSON/CSV.
- La API implementa cartelera paginada, filtros combinados, películas, funciones, salas y géneros.
- El frontend implementa inicio, cartelera, ficha de película, preferencias de contraste y tamaño
  de texto, estados de carga/error/vacío y navegación responsive basada en Moqups.
- Compilación, lint, formato y pruebas unitarias están automatizados desde el monorepo.

La migración y las consultas reales siguen pendientes de ejecutarse contra MySQL 8.4 en este
equipo. Tampoco se han realizado todavía mediciones con veinte usuarios simulados ni pruebas SUS
con cinco usuarios reales; esos resultados no deben declararse como cumplidos en el informe.

## Corte QA del 28 de julio de 2026

Se incorporaron umbrales de cobertura, pruebas HTTP, componentes React, repositorios SQL con
dobles, transacciones, parsers y casos temporales extremos. También se agregó un arnés reproducible
para veinte usuarios concurrentes y procedimientos de integración, seguridad, accesibilidad y
liberación.

Los resultados y limitaciones verificables están en
[qa-report-2026-07-28.md](qa-report-2026-07-28.md); la ejecución futura se rige por
[qa-strategy.md](qa-strategy.md). La ausencia local de Docker/MySQL continúa impidiendo certificar
infraestructura real y rendimiento, por lo que esas etapas permanecen pendientes.
