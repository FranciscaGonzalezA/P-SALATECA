# Estrategia y procedimientos de QA

## 1. Propósito

Este documento define cómo validar Salateca antes de integrar o liberar cambios. Busca detectar
regresiones en la normalización de funciones, persistencia, API, interfaz, accesibilidad y
trazabilidad sin confundir pruebas simuladas con validaciones reales de infraestructura.

## 2. Alcance

| Área                  | Riesgos principales                                                   | Evidencia automatizada                    |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| Scraper/normalización | fechas imposibles, zona horaria, duplicados, pérdida de fuente        | pruebas unitarias y cobertura             |
| Ingesta               | lotes parciales, errores por registro, savepoints, resumen incorrecto | servicio y repositorio con dobles         |
| Catálogo SQL          | inyección, filtros, paginación, joins duplicados, mapeo temporal      | repositorio con `Pool` simulado           |
| API                   | parámetros inválidos, 404, JSON malformado, salud degradada           | pruebas HTTP con Supertest                |
| Frontend              | fallback demo, filtros, navegación, estados vacío/error/carga         | Vitest, Testing Library y jsdom           |
| Accesibilidad         | nombres accesibles, contraste, escala, navegación móvil               | pruebas de componentes y recorrido visual |
| Contratos             | incompatibilidades TypeScript entre API y cliente                     | compilación estricta del monorepo         |
| MySQL real            | migraciones, restricciones, transacciones y consultas reales          | procedimiento de integración              |
| Rendimiento           | errores y latencia con 20 usuarios concurrentes                       | `tests/performance/catalog-load.mjs`      |

Quedan fuera de una ejecución local sin servicios: disponibilidad de sitios externos, autorización
de integraciones, pruebas con usuarios reales, recuperación ante desastres y rendimiento de
producción.

## 3. Pirámide de pruebas

1. **Unitarias:** normalización, esquemas, parsers, servicios, filtros demo y mapeos.
2. **Componentes:** renderizado e interacción React con red simulada.
3. **HTTP:** routers Express y contratos de error sin abrir puertos.
4. **Integración:** MySQL 8.4 dedicado, migraciones, seed, ingesta y consultas reales.
5. **Sistema/exploratorias:** frontend + API + MySQL, escritorio y móvil.
6. **No funcionales:** accesibilidad, seguridad de dependencias y carga controlada.

Los sitios de terceros siempre se sustituyen por fixtures. Las pruebas no deben depender de su
disponibilidad ni ejecutar scraping no autorizado.

## 4. Puertas de calidad automatizadas

`pnpm quality` debe finalizar con código cero y ejecuta, en este orden:

1. formato con Prettier;
2. lint de todos los paquetes;
3. pruebas con cobertura y umbrales;
4. compilación de producción.

Umbrales globales:

| Paquete  | Sentencias | Ramas | Funciones | Líneas |
| -------- | ---------: | ----: | --------: | -----: |
| Backend  |       80 % |  75 % |      80 % |   80 % |
| Frontend |       80 % |  70 % |      80 % |   80 % |
| Scraper  |       90 % |  80 % |      90 % |   90 % |

Los contratos son declaraciones de tipos sin lógica ejecutable; se validan mediante compilación
estricta y lint, no mediante una cifra artificial de cobertura.

Un cambio se rechaza si reduce un umbral, introduce una prueba inestable, requiere red externa en
la suite unitaria o deja una advertencia de lint.

## 5. Procedimiento diario

### Preparación

```powershell
pnpm install --frozen-lockfile
```

- usar Node.js 22 o superior y pnpm 11;
- no confirmar `.env`;
- no reutilizar datos personales o credenciales reales;
- confirmar que los fixtures tengan fechas y fuentes deterministas.

### Ejecución automatizada

```powershell
pnpm quality
pnpm qa:audit
```

Revisar los informes HTML:

- `backend/coverage/index.html`;
- `frontend/coverage/index.html`;
- `scraper/coverage/index.html`.

Si una prueba falla, registrar paquete, caso, resultado esperado, resultado observado, pasos y
evidencia. No actualizar expectativas únicamente para hacer pasar una regresión.

## 6. Procedimiento de integración con MySQL 8.4

Usar una base desechable y credenciales exclusivas de QA. Nunca ejecutar este procedimiento contra
producción.

1. Copiar `.env.example` a `.env` y reemplazar los secretos locales.
2. Iniciar MySQL 8.4:

   ```powershell
   docker compose up -d mysql
   docker compose ps
   ```

3. Aplicar migraciones y seeds:

   ```powershell
   pnpm db:migrate
   pnpm db:seed
   ```

4. Repetir `pnpm db:migrate`; debe omitir migraciones ya registradas.
5. Iniciar backend y consultar:

   ```powershell
   pnpm dev:backend
   Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
   Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/cartelera?pagina=1&limite=12'
   ```

6. Validar manualmente en MySQL:

   - todas las tablas usan `utf8mb4`;
   - claves foráneas impiden referencias huérfanas;
   - `uq_screenings_identity` impide duplicar película, sala e instante;
   - `schema_migrations` contiene cada archivo una sola vez;
   - fechas UTC y fecha/hora local concuerdan con `source_timezone`;
   - registros rechazados conservan payload, campo, código y mensaje;
   - un fallo de un registro no revierte los registros válidos del mismo lote;
   - URLs y búsquedas se transmiten como parámetros, nunca concatenadas.

7. Ingerir un fixture JSON y otro CSV que contengan un registro válido, uno duplicado y uno
   inválido. Confirmar que el resumen y las tablas de staging coincidan.
8. Ejecutar nuevamente `pnpm quality`.

Criterio de aceptación: salud `ok`, migraciones idempotentes, cero inconsistencias y respuesta API
coherente con la base.

## 7. Procedimiento de carga

Con la API de QA conectada a MySQL:

```powershell
$env:QA_BASE_URL = 'http://127.0.0.1:3000/api/v1'
$env:QA_USERS = '20'
$env:QA_REQUESTS_PER_USER = '5'
$env:QA_P95_LIMIT_MS = '1500'
pnpm qa:load
```

El ensayo realiza 100 solicitudes, con 20 usuarios concurrentes y cinco solicitudes secuenciales
por usuario. Falla si existe una respuesta no exitosa o si p95 supera 1.500 ms. Antes de cambiar el
umbral se debe justificar el entorno, volumen de datos y objetivo de servicio.

Registrar CPU, memoria, versión de MySQL, tamaño de datos, p50, p95, máximo, errores y códigos HTTP.
No extrapolar esta prueba local como capacidad de producción.

## 8. Procedimiento exploratorio de interfaz

Ejecutar en escritorio y en un viewport móvil cercano a 390 × 844:

1. Abrir inicio y comprobar un único `h1`, enlace para saltar contenido y ausencia de desbordamiento
   horizontal.
2. Abrir cartelera desde cabecera, menú y llamada principal.
3. Combinar búsqueda, fecha, hora, sala y género; comprobar conteo y funciones filtradas.
4. Limpiar filtros y recorrer paginación.
5. Abrir una película, revisar dirección, sinopsis, funciones, fuente, fecha de captura y URL
   oficial.
6. Simular API sin conexión; comprobar aviso demo en desarrollo.
7. Simular error sin fallback; comprobar mensaje y reintento.
8. Probar estados sin funciones y película inexistente.
9. Activar alto contraste y tamaños A−, A y A+; recargar y confirmar persistencia.
10. Navegar solo con teclado: Tab, Shift+Tab, Enter y Escape cuando corresponda.
11. Abrir/cerrar menú móvil y comprobar que el contenido continúa legible.
12. Revisar consola: cero errores y advertencias inesperadas.

La revisión automática de nombres accesibles no sustituye WCAG manual. Antes de liberar se debe
comprobar contraste con una herramienta especializada y realizar pruebas con lector de pantalla.

## 9. Seguridad y privacidad

- ejecutar `pnpm qa:audit` y resolver vulnerabilidades altas o críticas;
- verificar que `.env` y tokens no estén versionados;
- no mostrar mensajes SQL ni stack traces al cliente;
- confirmar límite JSON de 1 MiB y respuestas diferenciadas para JSON inválido y payload excesivo;
- probar cadenas con comillas, `%`, `_`, Unicode y texto largo en filtros;
- conservar CORS restringido al origen configurado;
- abrir enlaces externos con protección contra acceso a `window.opener`;
- no automatizar Instagram u otras fuentes sin permiso o API autorizada.

## 10. Gestión de defectos

Cada defecto debe incluir:

- identificador, severidad y área;
- versión/commit y ambiente;
- precondiciones y datos usados;
- pasos mínimos reproducibles;
- esperado frente a observado;
- evidencia y logs sin secretos;
- prueba de regresión asociada;
- responsable y estado.

Severidades:

- **S1 crítica:** pérdida/corrupción de datos, exposición de secretos o indisponibilidad completa;
- **S2 alta:** flujo principal inutilizable o datos de cartelera incorrectos;
- **S3 media:** degradación con alternativa disponible;
- **S4 baja:** defecto visual o textual sin impacto funcional.

S1 y S2 bloquean liberación. S3 requiere decisión explícita y plan. S4 puede diferirse.

## 11. Lista de liberación

- [ ] `pnpm quality` pasa desde una instalación limpia.
- [ ] Cobertura supera todos los umbrales.
- [ ] `pnpm qa:audit` no informa vulnerabilidades altas o críticas.
- [ ] Migraciones y seeds se ejecutaron en MySQL 8.4 de QA.
- [ ] Health, catálogo, detalle, salas y géneros responden con datos reales.
- [ ] Ingesta JSON y CSV conserva trazabilidad, rechazos y duplicados.
- [ ] Prueba con 20 usuarios cumple errores cero y p95.
- [ ] Recorrido escritorio/móvil y teclado completado.
- [ ] Contraste y lector de pantalla revisados.
- [ ] No existen secretos ni datos personales en cambios o evidencias.
- [ ] Documentación API, diccionario y reporte QA reflejan la versión liberada.

## 12. Evidencia

Conservar el comando, fecha, versiones, resultado, métricas y limitaciones. El reporte más reciente
se almacena como `docs/qa-report-AAAA-MM-DD.md`; no debe declarar como aprobada una prueba que fue
omitida por falta de infraestructura.
