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

`/cartelera` acepta `fecha`, `horario`, `sala`, `genero`, `buscar`, `orden`, `pagina` y `limite`. Los
filtros se pueden combinar. `limite` permite entre 1 y 50 resultados y utiliza 12 por defecto.
`orden` admite `proximas` (comportamiento predeterminado) y `destacados`. Este último pondera la
valoración de TMDB por su cantidad de votos usando 50 votos de confianza y una media de referencia
de 5,0; la popularidad de TMDB se utiliza como desempate y la próxima función como criterio final.
La cartelera, las funciones de cada película y el catálogo de `/salas` exponen únicamente salas
verificadas de la Región Metropolitana (`region_code = 'CL-RM'`).

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
| `PATCH`  | `/admin/posts/:id/order`   | Admin   | Mueve una publicación arriba o abajo.      |
| `DELETE` | `/admin/posts/:id`         | Admin   | Elimina una publicación.                   |
| `POST`   | `/admin/screenings/import` | Admin   | Importa funciones desde un archivo XLSX.   |
| `GET`    | `/admin/venues/pending`    | Admin   | Lista salas sin código de región.          |
| `PATCH`  | `/admin/venues/:id/region` | Admin   | Valida manualmente la región de una sala.  |

La automatización utiliza además `POST /internal/scraper/ingest`. Es un endpoint de servicio, no
una ruta para navegadores: exige `Authorization: Bearer <SCRAPER_INGEST_TOKEN>` y permanece
deshabilitado si el secreto no está configurado. Recibe lotes por fuente de hasta 5.000 registros
y los procesa mediante el mismo staging, validación transaccional y bitácora de la carga manual.

La sesión usa un token opaco aleatorio. Solo su hash SHA-256 se persiste en MySQL y el navegador
lo recibe en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción. Las mutaciones
administrativas validan el origen configurado en `FRONTEND_ORIGIN`. Una solicitud sin sesión
recibe `401`; una cuenta sin el rol `admin` recibe `403`.

El cuerpo de creación y actualización de posts contiene `title`, `body`, `imageUrl`,
`sourceName`, `sourceUrl` y `keywords`.

### Validación administrativa de salas

`GET /admin/venues/pending` devuelve las salas cuyo `region_code` es nulo o vacío, junto con su
dirección, comuna y cantidad de funciones. `PATCH /admin/venues/:id/region` recibe
`{ "regionCode": "CL-RM" }` y acepta los códigos ISO 3166-2 de las 16 regiones de Chile. La
actualización solo se aplica si la sala continúa pendiente, evitando que una sesión administrativa
desactualizada sobrescriba una clasificación previa. Una sala confirmada como `CL-RM` entra en el
catálogo público; las clasificadas en otra región permanecen fuera del alcance metropolitano.

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
devuelto por `/search/movie`. Los valores descriptivos existentes en `movies` nunca se reemplazan;
únicamente se completan campos nulos, géneros faltantes y un enlace externo al afiche. La
valoración, cantidad de votos y popularidad sí se refrescan después de siete días para que el
ranking no quede obsoleto.

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
