# Cine Arte Platform

MVP web para centralizar, normalizar y consultar la cartelera de cine arte local. La solución
separa la captura de fuentes, el staging de datos crudos, la normalización, la persistencia y la
publicación mediante API, tal como propone el informe del proyecto.

## Stack

- Frontend: React + TypeScript + Vite.
- Backend/API: Node.js + Express + TypeScript.
- Extracción y normalización: Node.js + TypeScript, con conectores por fuente.
- Persistencia: MySQL 8.4 LTS.
- Contratos compartidos: paquete TypeScript sin lógica de infraestructura.
- Monorepo: pnpm workspaces.

## Estructura

```text
.
├── frontend/              # Interfaz React
├── backend/               # API y reglas de negocio
├── scraper/               # Extracción y normalización
├── packages/contracts/    # DTO compartidos entre API y frontend
├── database/
│   ├── migrations/        # Esquema versionado
│   └── seeds/             # Datos de desarrollo
├── docs/                  # Arquitectura, convenciones y decisiones
├── tests/                 # Estrategia y pruebas transversales
├── .env.example
├── compose.yaml
└── README.md
```

## Puesta en marcha

Requisitos: Node.js 22 o superior, pnpm 11, MySQL 8.4 o Docker.

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d mysql
pnpm db:migrate
pnpm dev
```

Si MySQL está instalado directamente en Windows, crea la base y el usuario indicados en tu
`.env`, ejecuta las migraciones en orden y luego inicia los servicios. Nunca confirmes `.env`.

Servicios locales:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Estado API: `http://localhost:3000/api/v1/health`

La interfaz intenta consumir la API. En desarrollo puede utilizar datos de demostración mediante
`VITE_DEMO_MODE=true`; el modo se indica claramente en pantalla y no reemplaza la validación
final con MySQL.

El panel editorial está disponible en `http://localhost:5173/admin`. Antes de iniciar el backend,
define `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`; la contraseña debe contener al menos doce
caracteres. El backend crea esa cuenta si no existe y sincroniza su rol `admin` al arrancar, sin
sobrescribir cambios posteriores de contraseña. Las sesiones
duran ocho horas por defecto y se guardan en una cookie `HttpOnly`.

El acceso administrativo incluye recuperación de contraseña desde `/admin`. Configura
`PASSWORD_RESET_FROM_EMAIL` y `RESEND_API_KEY` para enviar los enlaces mediante Resend; estos
vencen después de 30 minutos por defecto y solo se pueden usar una vez. En desarrollo, si el correo
no está configurado, el backend imprime el enlace en su consola para facilitar pruebas locales.
Después de cambiar la contraseña se invalidan todas las sesiones activas de la cuenta.

Para revisar la interfaz sin base de datos ni credenciales, abre `/admin-demo`. Esta ruta utiliza
datos temporales en memoria y no reemplaza el panel protegido.

El panel permite importar funciones desde un XLSX con hoja `Cartelera` y columnas `Fecha parseada`,
`Fecha texto`, `Pelicula`, `Sala` y `URL`. La carga es parcial: conserva las filas correctas y
entrega un log CSV con la fila, el campo, el valor y el motivo de cada rechazo. No solicita datos
adicionales de la fuente: cada función conserva su sala y el sistema identifica automáticamente la
fuente desde el dominio de su URL. El formato completo está documentado en
[docs/api.md](docs/api.md#importación-administrativa-de-funciones).

Después de publicar las funciones, el backend consulta los títulos únicos en TMDB y completa los
campos vacíos de la película, sus géneros y el enlace al afiche. Configura
`TMDB_READ_ACCESS_TOKEN` (preferido) o `TMDB_API_KEY` en `.env`. Una coincidencia ambigua o un fallo
de TMDB no revierte las funciones que ya fueron importadas.

La comparación de títulos ignora mayúsculas, tildes, puntuación y diferencias tipográficas. También
reconoce años, títulos alternativos y etiquetas de edición o programación. Cuando más de una
película coincide, utiliza la primera según el orden de relevancia entregado por TMDB.

La importación rechaza actividades sin una película concreta —como paneles, charlas, clínicas o
premiaciones— y la API pública filtra las actividades históricas. Las funciones acompañadas por un
cineforo conservan la película y eliminan el sufijo editorial del título.

## Comandos

```powershell
pnpm dev            # inicia frontend, backend y scraper en modo desarrollo
pnpm build          # compila todos los paquetes
pnpm lint           # ejecuta análisis estático
pnpm test           # ejecuta pruebas
pnpm test:coverage  # ejecuta pruebas y exige umbrales
pnpm quality        # formato + lint + cobertura + compilación
pnpm qa:audit       # vulnerabilidades de dependencias productivas
pnpm qa:load        # carga controlada contra una API QA configurada
pnpm format:check   # comprueba formato
pnpm db:migrate     # aplica migraciones pendientes
pnpm db:seed        # carga datos de desarrollo
pnpm db:ingest -- archivo.json --source-name "Fuente" --source-type manual --base-url "https://example.com"
pnpm scraper:run     # recolecta; añade -- --publish para ingresar al staging
pnpm scraper:schedule # mantiene activa la programación semanal configurada
```

Consulta [docs/setup.md](docs/setup.md), [docs/architecture.md](docs/architecture.md),
[docs/api.md](docs/api.md), [docs/normalization.md](docs/normalization.md) y
[docs/data-dictionary.md](docs/data-dictionary.md). La extracción manual y semanal se documenta en
[docs/scraper.md](docs/scraper.md). Consulta estos documentos antes de implementar nuevas historias. La
estrategia, procedimientos y evidencia de calidad están en
[docs/qa-strategy.md](docs/qa-strategy.md) y
[docs/qa-report-2026-07-28.md](docs/qa-report-2026-07-28.md).

La puesta en marcha gradual y aislada de todos los servicios con Docker se documenta en
[docs/docker.md](docs/docker.md). El despliegue de producción se documenta en
[docs/deployment-railway.md](docs/deployment-railway.md).
