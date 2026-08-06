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
```

Consulta [docs/setup.md](docs/setup.md), [docs/architecture.md](docs/architecture.md),
[docs/api.md](docs/api.md), [docs/normalization.md](docs/normalization.md) y
[docs/data-dictionary.md](docs/data-dictionary.md) antes de implementar nuevas historias. La
estrategia, procedimientos y evidencia de calidad están en
[docs/qa-strategy.md](docs/qa-strategy.md) y
[docs/qa-report-2026-07-28.md](docs/qa-report-2026-07-28.md).
