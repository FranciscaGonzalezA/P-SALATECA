# Cine Arte Platform

La versión completa de SALATECA se recuperó desde los paquetes de `release/cpanel`.
Consulta [el informe de recuperación](docs/cpanel-recovery.md) para conocer la procedencia,
las limitaciones de los fuentes recuperados y la verificación. El frontend conserva el
runtime React empaquetado; el backend utiliza JavaScript recuperado y declaraciones de tipos.
Las migraciones están sincronizadas como archivos, sin aplicarlas.

MVP web para centralizar, normalizar y consultar la cartelera de cine arte local. La solución
separa la captura de fuentes, el staging de datos crudos, la normalización, la persistencia y la
publicación mediante API, tal como propone el informe del proyecto.

## Stack

- Frontend: runtime React recuperado como JavaScript + Vite.
- Backend/API: Node.js + Express, JavaScript recuperado y declaraciones TypeScript.
- Importación: XLSX administrativo; scraper excluido del workspace activo.
- Persistencia: MySQL 8.4 LTS.
- Monorepo: pnpm workspaces.

## Estructura

```text
.
├── frontend/              # Interfaz React
├── backend/               # API y reglas de negocio
├── scraper/               # Referencia histórica; excluida del workspace
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
pnpm dev
```

Si MySQL está instalado directamente en Windows, crea la base y el usuario indicados en tu
`.env`, ejecuta las migraciones en orden y luego inicia los servicios. Nunca confirmes `.env`.

Servicios locales:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Estado API: `http://localhost:3000/api/v1/health`

## Comandos

```powershell
pnpm dev            # inicia frontend y backend; scraper excluido del workspace
pnpm build          # compila todos los paquetes
pnpm lint           # ejecuta análisis estático
pnpm test           # ejecuta pruebas
pnpm format:check   # comprueba formato
```

Consulta [docs/setup.md](docs/setup.md), [docs/architecture.md](docs/architecture.md) y
[docs/conventions.md](docs/conventions.md) antes de implementar nuevas historias.

La revisión de los 111 temas de producción está en
[docs/production-readiness.md](docs/production-readiness.md), con evidencia y pendientes.
El procedimiento de operación y aceptación está en [docs/operations.md](docs/operations.md).
