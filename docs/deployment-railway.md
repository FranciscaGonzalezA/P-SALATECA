# Despliegue en Railway

Esta aplicación se despliega como cuatro servicios dentro de un mismo proyecto de Railway:

- `frontend`: único servicio con dominio público; usa `frontend/Dockerfile` y escucha en el puerto 80.
- `backend`: servicio privado; usa `backend/Dockerfile` y escucha en el puerto 3000.
- `scraper`: servicio privado y de una sola réplica; usa `scraper/Dockerfile`.
- `mysql`: base MySQL creada desde la plantilla de Railway, sin acceso público.

Railway traduce cada servicio de Compose a un servicio independiente. Los tres servicios de la
aplicación deben conectarse al mismo repositorio y construir desde la raíz, porque los Dockerfiles
usan el paquete compartido y el lockfile del monorepo. Define `RAILWAY_DOCKERFILE_PATH` en cada
servicio:

| Servicio | `RAILWAY_DOCKERFILE_PATH` |
| -------- | ------------------------- |
| frontend | `frontend/Dockerfile`     |
| backend  | `backend/Dockerfile`      |
| scraper  | `scraper/Dockerfile`      |

## Variables

Asigna primero un dominio al frontend. Después configura las variables, reemplazando
`https://salateca.cl` por el dominio real y manteniendo los secretos en Railway.

### Frontend

```dotenv
BACKEND_UPSTREAM=backend.railway.internal:3000
```

El build ya usa `VITE_API_URL=/api/v1` y `VITE_DEMO_MODE=false`, de modo que el navegador pasa por
el proxy del frontend y no necesita acceso público al backend.

### Backend

```dotenv
NODE_ENV=production
BACKEND_PORT=3000
FRONTEND_ORIGIN=https://salateca.cl
MYSQL_HOST=${{mysql.MYSQLHOST}}
MYSQL_PORT=${{mysql.MYSQLPORT}}
MYSQL_DATABASE=${{mysql.MYSQLDATABASE}}
MYSQL_USER=${{mysql.MYSQLUSER}}
MYSQL_PASSWORD=${{mysql.MYSQLPASSWORD}}
MYSQL_CONNECTION_LIMIT=10
ADMIN_EMAIL=administracion@salateca.cl
ADMIN_PASSWORD=<secreto de al menos 12 caracteres>
SESSION_DURATION_HOURS=8
PASSWORD_RESET_TOKEN_MINUTES=30
PASSWORD_RESET_FROM_EMAIL=Salateca <acceso@salateca.cl>
RESEND_API_KEY=<secreto de Resend>
TMDB_READ_ACCESS_TOKEN=<token de lectura de TMDB>
TMDB_LANGUAGE=es-CL
TMDB_REQUEST_TIMEOUT_MS=10000
SCRAPER_INGEST_TOKEN=<mismo secreto aleatorio de al menos 32 caracteres del scraper>
```

Si el servicio de base de datos tiene otro nombre, cambia `mysql` en las referencias. No expongas
MySQL ni el backend mediante dominios públicos o TCP Proxy.

### Scraper

```dotenv
SCRAPER_BACKEND_URL=http://backend.railway.internal:3000/api/v1
SCRAPER_INGEST_TOKEN=<mismo secreto configurado en el backend>
SCRAPER_USER_AGENT=Salateca/0.1 (contacto@salateca.cl)
SCRAPER_REQUEST_TIMEOUT_MS=10000
SCRAPER_REQUEST_RETRIES=2
SCRAPER_MIN_SUCCESSFUL_SOURCES=3
SCRAPER_MIN_ACCEPTED_RECORDS=1
SCRAPER_SCHEDULE_DAY=wednesday
SCRAPER_SCHEDULE_TIME=09:00
SCRAPER_SCHEDULE_TIMEZONE=America/Santiago
SCRAPER_RUN_ON_START=false
NEXO_INSTAGRAM_ACCESS_TOKEN=<opcional>
```

## Salud, dominio y datos

Configura `/health` como healthcheck del frontend y `/api/v1/health` como healthcheck del backend.
Mantén una sola réplica del backend durante el primer lanzamiento, porque cada inicio aplica las
migraciones, y una sola réplica del scraper para no duplicar la recolección semanal.

Agrega el dominio personalizado únicamente al frontend. Railway entregará los registros DNS que
debes crear y emitirá el certificado HTTPS. Cuando el dominio esté activo, confirma que
`FRONTEND_ORIGIN` coincide exactamente con su origen, incluyendo `https://` y sin barra final.

Activa los respaldos de MySQL antes de cargar datos reales. Después del primer despliegue comprueba:

1. `https://<dominio>/health` responde `ok`.
2. `https://<dominio>/api/v1/health` responde con estado `ok`.
3. La cartelera carga sin el aviso de modo demostración.
4. El acceso administrativo, cierre de sesión y recuperación de contraseña funcionan.
5. El scraper publica datos y no registra errores de autenticación.

No copies `.env` a Railway ni lo confirmes en Git; crea las variables en el panel y usa referencias
para las credenciales de MySQL.
