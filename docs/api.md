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

## Autenticación y administración

| Método   | Ruta                       | Acceso  | Descripción                                |
| -------- | -------------------------- | ------- | ------------------------------------------ |
| `POST`   | `/auth/login`              | Público | Inicia una sesión mediante correo y clave. |
| `GET`    | `/auth/me`                 | Sesión  | Devuelve la identidad autenticada.         |
| `POST`   | `/auth/logout`             | Público | Elimina la sesión y su cookie.             |
| `POST`   | `/admin/posts`             | Admin   | Crea una publicación.                      |
| `PUT`    | `/admin/posts/:id`         | Admin   | Actualiza una publicación.                 |
| `DELETE` | `/admin/posts/:id`         | Admin   | Elimina una publicación.                   |
| `POST`   | `/admin/screenings/import` | Admin   | Importa funciones desde un archivo XLSX.   |

La sesión usa un token opaco aleatorio. Solo su hash SHA-256 se persiste en MySQL y el navegador
lo recibe en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción. Las mutaciones
administrativas validan el origen configurado en `FRONTEND_ORIGIN`. Una solicitud sin sesión
recibe `401`; una cuenta sin el rol `admin` recibe `403`.

El cuerpo de creación y actualización de posts contiene `title`, `body`, `imageUrl`,
`sourceName`, `sourceUrl` y `keywords`.

### Importación administrativa de funciones

`POST /admin/screenings/import` recibe el XLSX como cuerpo binario con el tipo
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. No requiere parámetros
adicionales: cada fila conserva su `Sala` y su enlace oficial, mientras que el dominio de `URL` se
usa automáticamente para asociar la función con su fuente. Un mismo archivo puede mezclar salas y
dominios distintos. El límite es de 10 MB y 5.000 funciones por archivo.

El libro debe contener una hoja `Cartelera`. La fila 1 usa exactamente estos encabezados:

| Columna          | Contenido                                                      |
| ---------------- | -------------------------------------------------------------- |
| `Fecha parseada` | Fecha y hora en `YYYY-MM-DD HH:MM:SS` o `YYYY-MM-DDTHH:MM:SS`. |
| `Fecha texto`    | Fecha alternativa; también admite `DD/MM/YYYY HH:MM`.          |
| `Pelicula`       | Título de la película.                                         |
| `Sala`           | Nombre de la sala.                                             |
| `URL`            | Enlace HTTP o HTTPS de la función.                             |

Al menos una de las dos columnas de fecha debe ser válida. Si ambas son válidas deben representar
el mismo horario. Los horarios se interpretan en `America/Santiago` y se guardan además en UTC.

`Pelicula` debe identificar una obra audiovisual concreta. Actividades como paneles, charlas,
clínicas, premiaciones o funciones sin título se rechazan con `non_movie_activity` y no aparecen en
la cartelera. Sufijos como `+ cineforo`, indicadores de doblaje y prefijos editoriales reconocidos
se eliminan antes de construir la clave canónica de la película.

La respuesta contiene el identificador del proceso, su estado, los contadores `processed`,
`inserted`, `updated`, `duplicates` y `rejected`, y `errors`. Cada error informa `rowNumber`,
`field`, `value`, `code` y `message`. El panel muestra este detalle y permite descargarlo como CSV
para corregir y volver a cargar las filas rechazadas.

La propiedad `metadata` resume el enriquecimiento posterior de los títulos únicos mediante TMDB:
`requested`, `enriched`, `alreadyComplete`, `notFound`, `ambiguous`, `failed` y `disabled`. Solo se
aceptan coincidencias exactas después de normalizar mayúsculas, acentos y puntuación. Si existen
varias películas con el mismo título, se selecciona la primera película según el orden de relevancia
devuelto por `/search/movie`. Los valores existentes en `movies` nunca se reemplazan; únicamente se
completan campos nulos, géneros faltantes y un enlace externo al afiche.

La búsqueda también normaliza espacios Unicode, comillas y guiones tipográficos; separa años
anexados, indicadores de edición —como `doblada` o `versión extendida`—, títulos alternativos entre
paréntesis y etiquetas de programación posteriores a `/`, como `Ciclo` o `Cine`. Si el nombre
devuelto por TMDB es diferente, primero se revisan sus títulos alternativos oficiales. Si ninguna
variante coincide exactamente, se utiliza la primera película de la búsqueda de TMDB.

## Carga de archivos por consola

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
