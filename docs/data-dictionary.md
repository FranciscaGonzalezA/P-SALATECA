# Diccionario de datos del MVP

La persistencia utiliza MySQL 8.4 e InnoDB. Las fechas de auditoría se almacenan con precisión de
milisegundos y los instantes de las funciones se guardan en UTC.

## Captura y trazabilidad

| Tabla              | Propósito                                                 | Reglas principales                                                     |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `sources`          | Catálogo de fuentes externas.                             | URL base única y tipo controlado.                                      |
| `ingestion_runs`   | Bitácora de cada ejecución.                               | Registra procesados, aceptados, rechazados, duplicados y estado final. |
| `staging_records`  | Conserva el dato crudo y normalizado antes de publicarlo. | Estados `pending`, `valid`, `rejected` o `duplicate`.                  |
| `ingestion_errors` | Detalle durable de cada rechazo o fallo.                  | Conserva campo, código, mensaje y valor crudo cuando corresponde.      |

## Cartelera publicada

| Tabla            | Propósito                                  | Reglas principales                                                                                            |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `movies`         | Datos estandarizados de películas.         | Clave canónica indexada y `tmdb_id` único cuando existe.                                                      |
| `genres`         | Catálogo controlado de géneros.            | Nombre y slug únicos.                                                                                         |
| `movie_genres`   | Relación muchos-a-muchos.                  | Clave primaria compuesta e índice inverso por género.                                                         |
| `venues`         | Salas y espacios culturales.               | Nombre canónico único.                                                                                        |
| `screenings`     | Funciones publicadas.                      | Película, sala, fuente, fecha/hora y URL oficial obligatorias; identidad única por película, sala e instante. |
| `content_assets` | Recursos visuales o textuales de terceros. | Registra origen, titular, condición de uso y permiso de almacenamiento local.                                 |

### Metadata de películas

`content_type` distingue películas publicables de actividades conservadas para trazabilidad. Solo
las filas con `content_type = 'movie'` se exponen mediante la cartelera y las fichas públicas.

La integración de TMDB completa `original_title`, `release_year`, `duration_minutes`, `director`,
`synopsis` y `tmdb_id` solo cuando el valor local es nulo. `metadata_source` y
`metadata_synced_at` registran la procedencia y el último enriquecimiento exitoso. Los géneros se
relacionan mediante `movie_genres`; los afiches se guardan en `content_assets` como enlaces
externos con `rights_status = 'link_only'` y sin almacenamiento local.

## Contenido editorial

| Tabla   | Propósito                                                    | Reglas principales                                                                      |
| ------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `posts` | Publicaciones editoriales importadas desde fuentes externas. | URL de origen única, fuente obligatoria y palabras clave almacenadas como arreglo JSON. |

## Identidad y acceso

| Tabla           | Propósito                                  | Reglas principales                                               |
| --------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `users`         | Identidades autorizadas por la aplicación. | Correo único, hash de contraseña, estado y rol `user` o `admin`. |
| `user_sessions` | Sesiones opacas con vencimiento.           | Guarda solo SHA-256; se elimina en cascada junto con el usuario. |

Las contraseñas no se almacenan directamente: el backend conserva un hash `scrypt` con una sal
aleatoria por usuario. El token original de sesión existe únicamente en la cookie `HttpOnly` del
navegador.

### Campos de `posts`

| Campo        | Origen en el XLSX  | Regla                                                                   |
| ------------ | ------------------ | ----------------------------------------------------------------------- |
| `source_id`  | Fuente del archivo | Referencia obligatoria a `sources`; para este seed es Salateca de Cine. |
| `title`      | `Título del post`  | Texto obligatorio de hasta 500 caracteres.                              |
| `body`       | `Texto del cuerpo` | Contenido editorial completo en `LONGTEXT`.                             |
| `image_url`  | `Imagen`           | URL opcional; se usa `NULL` cuando no hay imagen principal.             |
| `source_url` | `URL`              | URL canónica e identidad única del post.                                |
| `keywords`   | `Keywords`         | Arreglo JSON de palabras clave normalizadas desde la lista con comas.   |

## Decisiones de modelado

- `starts_at` se guarda en UTC y `source_timezone` conserva la zona horaria de origen.
- Fecha y horario se separan durante la normalización para presentar y validar el dato, pero la
  identidad persistida usa un instante inequívoco.
- Una función siempre referencia la fila de staging que originó su publicación cuando está
  disponible.
- Un rechazo nunca se elimina silenciosamente: permanece en staging y tiene errores asociados.
- Los afiches o sinopsis sin autorización se mantienen como enlace mediante `content_assets`.
