# Validación del recorrido Excel → cartelera

Fecha: 2026-10-18. Alcance: revisión del release local, pruebas HTTP locales y consultas
de lectura a MySQL. No se realizó una importación persistente, un despliegue ni una
prueba visual de navegador contra la aplicación publicada.

## Resultado

El paquete `release/cpanel` contiene la importación y la API de catálogo que no aparecen
en los fuentes principales. La conclusión anterior de que solo existe información y
salud describe `backend/src`, pero no representa el paquete completo de publicación.
No corresponde afirmar que falta implementar toda la API.

## Evidencia ejecutada

- Se compararon por SHA-256 once módulos compilados de `backend/dist` con los del
  release, antes de ejecutarlos. Coinciden los módulos de parser, ingesta, rutas,
  validación, catálogo, autorización y servicio de metadatos usados en las pruebas.
- Se generaron libros XLSX de prueba con ExcelJS: lectura de hoja `Cartelera`,
  validación de columnas, archivo corrupto, hoja vacía y errores de fecha, título,
  sala y URL. La fecha local 2026-10-20 19:30 se convirtió a 22:30 UTC.
- La ruta HTTP de importación rechazó ausencia de sesión (401), rol no administrador
  (403) y origen ajeno (403).
- Excel → parser → servicio de ingesta por HTTP funcionó con repositorio simulado.
  La segunda importación informó duplicado; las filas inválidas incluyeron número de fila.
  Esta prueba no demuestra persistencia, rollback ni concurrencia en MySQL real.
- MySQL real respondió en modo lectura: 295 películas, 896 funciones, cero salas
  pendientes de clasificación y seis funciones de salas RM vigentes según el criterio
  de fecha del catálogo. El catálogo devolvió cinco películas.
- Con el router de catálogo y repositorio MySQL real, respondieron 200 y JSON:
  `/api/v1/cartelera`, `/api/v1/salas`, `/api/v1/generos`, detalle de una película
  existente y sus funciones. El filtro combinado de fecha y sala devolvió la película esperada.
  Se usó un pool con `dateStrings: true`, igual que el release.
- Se inspeccionó el JavaScript de `salateca-frontend.zip`: envía el XLSX como cuerpo
  binario a `/admin/screenings/import` con cookies; consulta `/cartelera`, `/salas`,
  `/generos` y `/peliculas/:id`; contempla resultados vacíos, fallos y presentación
  de funciones con enlace/fuente. No equivale a verificar los clics y el renderizado.

## Recorrido real

1. Administrador autenticado selecciona XLSX. La hoja debe llamarse `Cartelera` y
   contener `Fecha parseada`, `Fecha texto`, `Pelicula`, `Sala` y `URL`.
2. La API acepta hasta 10 MB y el parser hasta 5000 filas; valida cada fila y normaliza
   fechas en America/Santiago.
3. El repositorio implementa transacción, staging, errores por fila y savepoints.
   Películas y salas se crean o reutilizan. La identidad de función usa película,
   sala y hora de inicio. Ese comportamiento SQL fue inspeccionado, no probado con escrituras.
4. Una sala nueva se crea sin región: un administrador debe validarla mediante
   `/admin/venues/:id/region` como `CL-RM` para publicarla en este catálogo.
5. La API pública devuelve películas y funciones programadas desde la fecha corriente
   en salas RM. No devuelve toda la importación automáticamente: excluye actividades,
   funciones pasadas y salas sin validar o de otra región.
6. El frontend del ZIP consulta la API configurada en su compilación:
   `https://api.rpayweb.cl/api/v1`. No se comprobó disponibilidad, cookies ni CORS de ese servidor.

## Pendientes antes de considerar validado el MVP completo

1. **Recuperar y sincronizar fuentes.** `frontend/src/App.tsx` es una página inicial,
   `backend/src/app.ts` solo monta metadatos/salud y `database/migrations` solo contiene
   001. El release tiene módulos adicionales y migraciones 001–012; la base local
   registra además 013 y 014. Compilar los fuentes actuales no reproduce la aplicación
   completa y puede reemplazar los artefactos de dist por la base inicial.
2. **Aplicar mejoras a la versión correcta.** Los cambios de seguridad y operación
   recientes se hicieron en los fuentes principales; no se trasladan automáticamente
   al backend compilado del release. El CI actual tampoco prueba esos módulos ausentes.
3. **Ensayo integrado en una base aislada.** Importar XLSX real desde la interfaz,
   comprobar filas guardadas, importar otra vez y verificar ausencia de duplicados,
   revisar errores, validar sala nueva y comprobar tarjetas/filtros tras recargar.
4. **Definir correcciones de horario y cancelaciones.** El SQL identifica por hora de
   inicio: cambiar la hora en otro Excel crea otra función, no reemplaza la anterior.
   Omitir una función de la próxima planilla no la cancela. Acordar un mecanismo de
   edición/cancelación para evitar horarios obsoletos.
5. **Verificar entorno publicado.** URL de API, cookies de sesión, origen permitido,
   HTTPS y ruta de navegación directa deben comprobarse en el dominio definitivo.

No se cambiaron datos de la base ni archivos del release durante esta validación.
