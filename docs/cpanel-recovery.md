# Recuperación de SALATECA desde cPanel

Se usaron `release/cpanel/salateca-api.zip` y `salateca-frontend.zip` como referencia de la versión publicada. Sus SHA-256 y los archivos recuperados se registran en `recovery-manifest.json`. El ZIP de API incluye las migraciones 013 y 014, ausentes de `complete-staging`.

No se encontraron los fuentes originales completos en el árbol local ni en el único commit disponible. Los mapas del backend contienen rutas y posiciones, pero no `sourcesContent`. Se recuperó el JavaScript de cada módulo y sus declaraciones `.d.ts`; no se inventaron fuentes TypeScript. El backend compila con TypeScript en modo `allowJs`, sin comprobación estática del JavaScript recuperado.

El frontend se recuperó como `frontend/src/recovered-salateca.js`, formateado para permitir su edición, con su CSS y favicon. Conserva el runtime y las dependencias empaquetadas del artefacto. No fue posible recuperar los TSX originales, la separación en componentes, los tipos, los nombres eliminados por el empaquetador ni las pruebas originales. Cambiar las dependencias React del manifiesto no actualiza el React incluido en ese módulo: para hacerlo se requiere reconstruir los componentes.

Las seis referencias a la API de producción se sustituyeron por `VITE_API_BASE_URL`, cuyo valor por defecto es `/api/v1`. Vite redirige `/api` al backend local según `BACKEND_PORT`. Las rutas de autenticación, catálogo, publicaciones, salas, metadatos y carga administrativa XLSX se conservan. El scraper no pertenece al workspace activo y su ruta no se recuperó ni se monta. Los archivos históricos de `scraper/` permanecen como referencia.

Se conservaron los controles operativos locales: cabeceras, límite de solicitudes y sondas live/ready. Los archivos locales anteriores a la recuperación, incluidos cambios sin commit, están respaldados en `tmp/recovery/before/`. No se modificó `.env`.

## Uso local

Instalar con `pnpm install --offline --ignore-scripts` si la caché está disponible. Ejecutar `pnpm build`, `pnpm test` y `pnpm lint`. `pnpm dev` inicia frontend y backend, sin scraper.

Las migraciones se sincronizaron únicamente como archivos; no se ejecutaron migraciones, semillas ni herramientas de ingestión contra MySQL. No se desplegó. Las pruebas nuevas utilizan repositorios simulados, por lo que no validan un esquema real ni datos de producción. El inicio manual normal de la API sí utilizará la conexión definida por el usuario.

## Verificación realizada

- Compilación de frontend y backend: correcta. El CSS generado conserva el hash `index-FVlgGwP4.css` del release.
- Ocho pruebas de backend aprobadas: controles operativos, lectura XLSX y zona horaria de Santiago, rechazo de archivos inválidos, autenticación y origen en importación, publicación con repositorio simulado y ruta de scraper ausente.
- El frontend no dispone de pruebas automatizadas recuperables; su comando de pruebas termina sin encontrar archivos. No se hizo una validación visual ni una integración con MySQL.
- Sintaxis válida en 46 archivos JavaScript; las 14 migraciones coinciden byte por byte con el ZIP de API.
- Las dependencias se instalaron con scripts de instalación deshabilitados y se actualizó `pnpm-lock.yaml`. Fue necesario descargar paquetes ausentes de la caché.
