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

| Método   | Ruta               | Acceso  | Descripción                                |
| -------- | ------------------ | ------- | ------------------------------------------ |
| `POST`   | `/auth/login`      | Público | Inicia una sesión mediante correo y clave. |
| `GET`    | `/auth/me`         | Sesión  | Devuelve la identidad autenticada.         |
| `POST`   | `/auth/logout`     | Público | Elimina la sesión y su cookie.             |
| `POST`   | `/admin/posts`     | Admin   | Crea una publicación.                      |
| `PUT`    | `/admin/posts/:id` | Admin   | Actualiza una publicación.                 |
| `DELETE` | `/admin/posts/:id` | Admin   | Elimina una publicación.                   |

La sesión usa un token opaco aleatorio. Solo su hash SHA-256 se persiste en MySQL y el navegador
lo recibe en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción. Las mutaciones
administrativas validan el origen configurado en `FRONTEND_ORIGIN`. Una solicitud sin sesión
recibe `401`; una cuenta sin el rol `admin` recibe `403`.

El cuerpo de creación y actualización de posts contiene `title`, `body`, `imageUrl`,
`sourceName`, `sourceUrl` y `keywords`.

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
