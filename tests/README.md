# Estrategia de pruebas

- `frontend`: componentes, accesibilidad y flujos de búsqueda/filtro.
- `backend`: endpoints, validación, consultas parametrizadas y manejo de errores.
- `scraper`: fixtures por fuente, normalización, duplicados y registros rechazados.
- `tests/integration`: flujo staging -> publicación -> API, cuando MySQL de pruebas esté listo.

Los datos externos deben probarse con fixtures locales para no depender de sitios de terceros.
