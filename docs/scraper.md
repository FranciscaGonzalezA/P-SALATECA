# Scraper de cartelera

El módulo `scraper` contiene conectores para las doce fuentes del generador original: Cine Arte
Normandie, Centro Arte Alameda/Passline, El Biógrafo, Sala K, Sala Nemesio/Ticketplus, Cine
CCC/Ecopass, Matucana 100, Goethe-Institut Chile, Cineteca Nacional, Cine UC, Duoc UC/Luma y Nexo
Cinema/Instagram. Cada conector produce el contrato `RawScreening`; la normalización común valida
fechas, zona horaria, trazabilidad y duplicados antes de publicar.

Once conectores no requieren credenciales. Nexo se registra sólo cuando existe
`NEXO_INSTAGRAM_ACCESS_TOKEN` y consulta la API de Instagram con Bearer token; no automatiza un
inicio de sesión ni guarda cookies. Cine UC puede informar HTTP 403 si el CAPTCHA de Cloudflare
rechaza la IP del servidor. Ese fallo queda aislado y no descarta las demás fuentes. Una fuente que
responde sin funciones vigentes, como Passline o Goethe, produce cero registros sin inventar
cartelera.

## Configuración

Genera un secreto aleatorio de al menos 32 caracteres y guárdalo como `SCRAPER_INGEST_TOKEN` en
el entorno del backend y del scraper. El valor de ejemplo que comienza con `replace_with_` no
habilita el endpoint. Configura además un `SCRAPER_USER_AGENT` con un contacto real.

Los umbrales `SCRAPER_MIN_SUCCESSFUL_SOURCES` y `SCRAPER_MIN_ACCEPTED_RECORDS` impiden publicar
una ejecución vacía o con demasiadas fuentes rotas. Cada fallo se informa por fuente y provoca un
código de salida distinto de cero en la ejecución manual, sin eliminar los resultados de las
fuentes que sí respondieron.

Para habilitar Nexo Cinema, entrega un token vigente con permiso para leer los medios de la cuenta:

```dotenv
NEXO_INSTAGRAM_ACCESS_TOKEN=token_emitido_por_instagram
```

El token se envía en la cabecera `Authorization` y no se incorpora a URLs, archivos de salida ni
mensajes de error.

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

Identificadores disponibles: `normandie`, `passline_alameda`, `el_biografo`, `sala_k`,
`ticketplus_nemesio`, `ecopass_cine_ccc`, `m100_cine`, `goethe_chile`, `cineteca_nacional`,
`cine_uc`, `duoc_luma` y `nexo_instagram`. El último requiere el token indicado arriba.

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
