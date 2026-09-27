# Entorno Docker aislado

Docker es opcional y no reemplaza el flujo local con `pnpm`. La configuración publica los servicios
solo en `127.0.0.1` y utiliza puertos distintos de los valores locales:

- MySQL: `3308`
- API: `3001`
- Aplicación web: `5174`

Docker Compose asigna a la red y al volumen un prefijo derivado del directorio del proyecto. No se
usan nombres globales de contenedores, por lo que otros proyectos conservan sus propios recursos.

## Preparación

1. Instala Docker Desktop con el motor WSL 2 y reinicia Windows si el instalador lo solicita.
2. Copia `.env.example` a `.env` si todavía no existe.
3. Reemplaza todos los valores `replace_with_*` por credenciales locales.
4. Comprueba la configuración sin iniciar servicios:

```powershell
docker compose config --quiet
docker compose --profile app config --quiet
```

## Activación gradual

Levanta primero solo MySQL y comprueba su estado:

```powershell
docker compose up -d mysql
docker compose ps
```

El desarrollo local continúa igual; para conectarlo a MySQL de Docker usa
`MYSQL_HOST=127.0.0.1` y `MYSQL_PORT=3308` en `.env`, y luego ejecuta `pnpm db:migrate`. El
contenedor MySQL no aplica migraciones por su cuenta para evitar que compita con el migrador del
backend.

Cuando la base esté saludable, construye y levanta la aplicación completa:

```powershell
docker compose --profile app build
docker compose --profile app up -d
docker compose ps
```

Para activar además el scraper semanal, configura `SCRAPER_INGEST_TOKEN` y agrega el perfil
`scraping`:

```powershell
docker compose --profile app --profile scraping up -d --build
```

Visita `http://localhost:5174` y confirma que `http://localhost:3001/api/v1/health` responde con
`status: ok`. La imagen del backend aplica las migraciones pendientes antes de iniciar la API.

## Detención y datos

```powershell
docker compose --profile app down
```

Este comando conserva la base. No agregues `--volumes` salvo que quieras eliminar explícitamente
todos los datos MySQL de este entorno.

Los puertos pueden cambiarse mediante `DOCKER_MYSQL_PORT`, `DOCKER_BACKEND_PORT` y
`DOCKER_FRONTEND_PORT`. Si cambias el puerto del frontend, el backend recibe automáticamente el
nuevo origen permitido.
