# Configuración local

## 1. Variables de entorno

Copia `.env.example` como `.env` y reemplaza todos los valores `replace_with_*`. El archivo
real está ignorado por Git.

## 2. MySQL

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
pnpm dev
```

## 4. Verificación

```powershell
pnpm format:check
pnpm lint
pnpm test
pnpm build
```
