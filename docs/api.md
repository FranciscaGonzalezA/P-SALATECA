# API pública

La API se publica bajo `/api/v1`. El frontend consume únicamente estos contratos; no accede a
MySQL ni importa código del backend.

## Endpoints de lectura

| Método | Ruta                       | Descripción                            |
| ------ | -------------------------- | -------------------------------------- |
| `GET`  | `/cartelera`               | Películas con funciones y paginación.  |
| `GET`  | `/peliculas/:id`           | Ficha y funciones de una película.     |
| `GET`  | `/peliculas/:id/funciones` | Próximas funciones de una película.    |
| `GET`  | `/salas`                   | Catálogo de salas.                     |
| `GET`  | `/generos`                 | Catálogo de géneros.                   |
| `GET`  | `/posts`                   | Listado de publicaciones editoriales.  |
| `GET`  | `/posts/:id`               | Contenido completo de una publicación. |
| `GET`  | `/health`                  | Conectividad de API y base de datos.   |

`/cartelera` acepta `fecha`, `horario`, `sala`, `genero`, `buscar`, `pagina` y `limite`. Los
filtros se pueden combinar. `limite` permite entre 1 y 50 resultados y utiliza 12 por defecto.

Todas las consultas usan parámetros de MySQL. Las respuestas exitosas usan `data`; la cartelera
añade `meta` con paginación y tiempo de procesamiento. Los errores usan `error.code`,
`error.message` y, cuando corresponde, `error.fields`.

## Carga de archivos

El cargador acepta JSON o CSV con el contrato normalizado:

```powershell
pnpm db:ingest -- datos.json `
  --source-name "Cartelera oficial" `
  --source-type website `
  --base-url "https://example.com"
```

Un JSON puede ser un arreglo de registros o un objeto con la propiedad `records`. Un registro
también puede separar `rawPayload` y `normalizedPayload`. En CSV, la primera fila contiene los
nombres del contrato normalizado.

La carga completa ocurre en una transacción. Cada registro utiliza un savepoint, por lo que un
rechazo no elimina el resto del lote. El resumen distingue procesados, insertados, actualizados,
rechazados y duplicados.
