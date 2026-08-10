# Scraper de cartelera

El módulo `scraper` incorpora conectores productivos para Cine Arte Normandie, El Biógrafo,
Sala K, Matucana 100 y Cineteca Nacional. Cada conector produce el contrato `RawScreening`; la
normalización común valida fechas, zona horaria, trazabilidad y duplicados antes de publicar.

Instagram permanece deshabilitado. Cine UC tampoco se consulta porque su antigua URL de cartelera
ya no expone una programación compatible. Ninguna fuente debe habilitarse sin un conector probado
y, para redes sociales, sin revisar permisos o una API oficial.

## Configuración

Genera un secreto aleatorio de al menos 32 caracteres y guárdalo como `SCRAPER_INGEST_TOKEN` en
el entorno del backend y del scraper. El valor de ejemplo que comienza con `replace_with_` no
habilita el endpoint. Configura además un `SCRAPER_USER_AGENT` con un contacto real.

Los umbrales `SCRAPER_MIN_SUCCESSFUL_SOURCES` y `SCRAPER_MIN_ACCEPTED_RECORDS` impiden publicar
una ejecución vacía o con demasiadas fuentes rotas. Cada fallo se informa por fuente y provoca un
código de salida distinto de cero en la ejecución manual, sin eliminar los resultados de las
fuentes que sí respondieron.

## Ejecución manual

Recolectar y validar sin modificar la base de datos:

```powershell
pnpm scraper:run -- --output tmp/scraper-latest.json
```

Recolectar, validar y publicar mediante el staging del backend:

```powershell
pnpm scraper:run -- --publish
```

Limitar la prueba a una o más fuentes:

```powershell
pnpm scraper:run -- --source normandie --source m100_cine --output tmp/prueba.json
```

Identificadores disponibles: `normandie`, `el_biografo`, `sala_k`, `m100_cine` y
`cineteca_nacional`.

## Programación semanal

El scheduler utiliza por defecto miércoles a las 09:00 en `America/Santiago`. Se configura con:

```dotenv
SCRAPER_SCHEDULE_DAY=wednesday
SCRAPER_SCHEDULE_TIME=09:00
SCRAPER_SCHEDULE_TIMEZONE=America/Santiago
SCRAPER_RUN_ON_START=false
```

Para mantenerlo activo localmente:

```powershell
pnpm scraper:schedule
```

En Docker, activa la aplicación y el perfil de scraping:

```powershell
docker compose --profile app --profile scraping up -d --build
```

El contenedor `scraper` permanece activo y ejecuta una sola vez por fecha programada. El backend
recibe cada fuente por separado en `POST /api/v1/internal/scraper/ingest`, protegido por Bearer
token, y conserva el dato crudo, los rechazos y el resultado de publicación en la bitácora.
