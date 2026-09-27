# Arquitectura inicial

La plataforma usa una arquitectura cliente-servidor con una canalización de datos desacoplada:

```text
Fuentes externas / carga manual
              |
              v
Scraper y conectores por fuente
              |
              v
Staging + bitácora de ingesta
              |
              v
Normalización y validación
              |
              v
MySQL (datos publicados + trazabilidad)
              |
              v
Backend/API
              |
              v
Frontend React
```

## Decisiones

1. **TypeScript de extremo a extremo.** Reduce diferencias entre contratos del scraper, API y
   frontend.
2. **MySQL 8.4 LTS.** Reemplaza PostgreSQL sin cambiar el carácter relacional del diseño. Se
   mantienen claves foráneas, restricciones, índices y transacciones.
3. **Staging separado.** Ningún registro extraído se publica directamente. Primero conserva el
   dato crudo, su fuente, fecha de captura, estado y errores de validación.
4. **Conectores independientes.** Cada sitio, calendario, carga manual o futura integración de
   red social debe tener su propio conector.
5. **Trazabilidad obligatoria.** Funciones y recursos externos conservan su URL y fuente de
   origen, la fecha de captura y su condición de uso.
6. **API versionada.** Los endpoints públicos parten bajo `/api/v1`.
7. **Frontend y backend independientes.** React solo consume contratos HTTP. Las consultas,
   transacciones y credenciales permanecen en el backend.
8. **Contratos compartidos sin infraestructura.** `packages/contracts` contiene únicamente DTO;
   no importa Express, React, MySQL ni código del scraper.

## Capas implementadas

- `scraper`: conectores, contrato crudo y normalización por lotes;
- `backend/modules/ingestion`: validación de entrada, staging y publicación transaccional;
- `backend/modules/catalog`: rutas, servicio de aplicación y repositorio MySQL;
- `backend/modules/metadata`: búsqueda segura en TMDB y persistencia de fichas incompletas;
- `backend/modules/auth`: contraseñas con `scrypt`, sesiones opacas y autorización por rol;
- `backend/modules/posts`: lectura pública y edición exclusiva para administradores;
- `packages/contracts`: respuestas y modelos públicos de la API;
- `frontend/api`: cliente HTTP y adaptación explícita de datos de demostración;
- `frontend/components` y `frontend/views`: presentación responsive basada en el prototipo.

## Control de acceso

El MVP utiliza los roles fijos `user` y `admin`. El backend es la autoridad: autentica la cookie,
recupera la sesión vigente desde MySQL y aplica el rol antes de ejecutar una mutación. El frontend
oculta el acceso administrativo cuando corresponde, pero esa condición no sustituye la
autorización de la API.

## Límites del primer día

Esta base no automatiza el inicio de sesión de Instagram ni descarga material protegido. Nexo
Cinema se integra únicamente mediante un token configurable para la API de Instagram. TMDB se
utiliza como fuente de metadatos posterior a la importación; sus credenciales nunca se almacenan
en Git.
