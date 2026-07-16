# Convenciones del proyecto

## Idioma y nombres

- Código, rutas y nombres de archivos: inglés.
- Documentación y mensajes visibles al usuario: español.
- Componentes React y tipos: `PascalCase`.
- Variables, funciones y archivos TypeScript: `camelCase`.
- Constantes globales: `UPPER_SNAKE_CASE`.
- Tablas y columnas MySQL: `snake_case`, sustantivos plurales para tablas.
- Rutas HTTP: minúsculas y sustantivos plurales, por ejemplo `/api/v1/screenings`.

## Formato

- TypeScript estricto; evitar `any`.
- Dos espacios, comillas simples, punto y coma y ancho máximo de 100 caracteres.
- Prettier define el formato; ESLint identifica errores y malas prácticas.
- Las fechas se intercambian en ISO 8601 y se guardan en UTC cuando incluyen hora.
- Todo contenido externo se valida en el backend y se renderiza como texto por defecto.

## Git

- `main`: versión estable y entregable.
- `develop`: integración del trabajo en curso.
- `feature/KAN-4-tmdb-api`: funcionalidad nueva.
- `fix/KAN-1-normalizacion-scraper`: corrección.
- `docs/KAN-0-arquitectura`: documentación.

Los commits siguen Conventional Commits e incluyen el identificador Kanban cuando exista:

```text
feat(scraper): KAN-7 agregar cargador de cartelera
fix(normalizer): KAN-1 corregir nombres de salas
docs(readme): explicar configuración local de MySQL
```

Antes de integrar: `pnpm format:check`, `pnpm lint`, `pnpm test` y `pnpm build`.
