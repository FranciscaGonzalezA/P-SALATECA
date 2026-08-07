# Configuración local

## 1. Variables de entorno

Copia `.env.example` como `.env` y reemplaza todos los valores `replace_with_*`. El archivo
real está ignorado por Git.

Para completar automáticamente las fichas importadas configura `TMDB_READ_ACCESS_TOKEN` o
`TMDB_API_KEY`; si están ambas, el backend utiliza el token de lectura. `TMDB_LANGUAGE` controla
el idioma solicitado y `TMDB_REQUEST_TIMEOUT_MS` limita cada llamada. Sin credenciales, la carga
Excel continúa y la respuesta indica `metadata.disabled = true`.

El pie del sitio conserva el aviso de atribución exigido por TMDB. No lo elimines mientras la
aplicación utilice sus datos o imágenes; revisa además sus condiciones si el proyecto pasa a tener
un uso comercial.

## 2. MySQL

Configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` para crear la cuenta administradora inicial. La
contraseña debe tener al menos doce caracteres. `SESSION_DURATION_HOURS` controla la duración de
la sesión y utiliza ocho horas por defecto.

Opción recomendada para un entorno reproducible:

```powershell
docker compose up -d mysql
docker compose ps
```

La primera creación del volumen ejecuta los archivos de `database/migrations` en orden. Si el
volumen ya existe, aplica las migraciones nuevas manualmente con el cliente `mysql`.

Con una instalación nativa de MySQL 8.4, crea una base con `utf8mb4` y un usuario de aplicación
con privilegios limitados a esa base. No uses `root` desde el backend.

## 3. Aplicación

```powershell
pnpm install
pnpm db:migrate
pnpm dev
```

Las migraciones deben estar aplicadas antes de arrancar el backend. El panel queda disponible en
`/admin`.

## 4. Verificación

```powershell
pnpm quality
pnpm qa:audit
```

`pnpm quality` comprueba formato, lint, cobertura con umbrales y compilación. Para integración con
MySQL, carga y revisión exploratoria sigue [qa-strategy.md](qa-strategy.md).
