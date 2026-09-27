# Matriz de trazabilidad

## Convenciones

- **Implementado:** existe código y evidencia automatizada suficiente para el corte.
- **Parcial:** existe una parte funcional, pero el criterio completo no está cubierto.
- **Pendiente de validación:** la capacidad existe o está diseñada, pero falta evidencia en un
  entorno real o con usuarios.

## Requisitos funcionales

| ID    | Requisito priorizado                               | Estado       | Implementación y evidencia                                                                                                                                              | Brecha o siguiente acción                                                                                                        |
| ----- | -------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Integrar al menos cinco fuentes de cartelera       | Implementado | `scraper/src/connectors` contiene 11 conectores por defecto y uno opcional para Nexo. La creación y coordinación se prueba en `connectors.test.ts` y `runtime.test.ts`. | Ejecutar los conectores autorizados en ambiente de QA y conservar bitácora de una corrida.                                       |
| RF-02 | Normalizar la información recopilada               | Implementado | `scraper/src/normalization/normalizeScreening.ts` y el módulo de ingesta estandarizan títulos, salas, fechas, horarios, zona horaria y fuente.                          | Adjuntar una muestra antes/después de una corrida real.                                                                          |
| RF-03 | Visualizar cartelera vigente                       | Implementado | `CatalogView`, API `/cartelera` y repositorio MySQL presentan películas con funciones programadas, paginación y orden.                                                  | Validar la consulta contra MySQL real.                                                                                           |
| RF-04 | Buscar películas y funciones                       | Implementado | El parámetro `buscar` valida hasta 120 caracteres y se aplica en el repositorio del catálogo. Existen pruebas de API y frontend.                                        | Incorporar captura de un resultado buscado durante la demostración.                                                              |
| RF-05 | Filtrar por fecha, sala, horario y género          | Implementado | Los cuatro filtros individuales y combinados están presentes en contrato, API, SQL y vista de catálogo.                                                                 | Registrar tiempo de respuesta real con datos de QA.                                                                              |
| RF-06 | Consultar detalle de una película y sus funciones  | Implementado | `MovieDetailView`, `/peliculas/:id` y `/peliculas/:id/funciones` entregan ficha, géneros, cartelera, sala y enlace oficial.                                             | Demostrar un caso con metadatos completos y otro sin funciones.                                                                  |
| RF-07 | Informar origen y vigencia de los datos            | Implementado | Los DTO y la interfaz exponen fuente, URL oficial, captura y última sincronización. La base conserva `source_id`, `official_url` y `captured_at`.                       | Adjuntar captura donde los campos sean legibles.                                                                                 |
| RF-08 | Validar registros y controlar duplicados           | Implementado | Staging, Zod, clasificador, parsers, `ingestion_errors`, restricciones únicas y savepoints cubren rechazos, duplicados y publicación parcial.                           | Ejecutar un lote real con una fila válida, una inválida y una duplicada.                                                         |
| RF-09 | Administrar películas, salas y funciones           | Parcial      | El administrador puede autenticarse, importar funciones, validar la región de salas y administrar publicaciones.                                                        | Implementar CRUD/desactivación de películas, salas y funciones o acotar formalmente el requisito para esta iteración.            |
| RF-10 | Ocultar funciones vencidas sin perder trazabilidad | Parcial      | El catálogo filtra estados programados y fechas anteriores; la base conserva los registros históricos.                                                                  | Cambiar el filtro para considerar fecha y hora: una función terminada hoy puede permanecer visible. Agregar prueba de regresión. |
| RF-11 | Acceder al canal oficial                           | Implementado | Las funciones conservan `official_url`; los enlaces externos se muestran con protección frente a `window.opener`.                                                       | Verificar enlaces de una muestra real antes de la presentación.                                                                  |

## Requisitos no funcionales

| ID     | Atributo                          | Estado                         | Evidencia disponible                                                                                              | Evidencia pendiente                                                                                   |
| ------ | --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| RNF-01 | Rendimiento menor o igual a 2 s   | Pendiente de validación        | Existe `tests/performance/catalog-load.mjs` para 20 usuarios.                                                     | Ejecutarlo contra API y MySQL de QA; registrar p50, p95, máximo y errores.                            |
| RNF-02 | Usabilidad SUS mayor o igual a 75 | Pendiente de validación        | Existe procedimiento exploratorio en `docs/qa-strategy.md`.                                                       | Realizar sesiones con al menos cinco usuarios y consolidar SUS.                                       |
| RNF-03 | Diseño adaptable                  | Parcial                        | CSS responsive, menú móvil y pruebas de componentes. La revisión histórica utilizó 390 x 844.                     | Repetir el recorrido visual del corte y adjuntar capturas de escritorio y móvil.                      |
| RNF-04 | Accesibilidad                     | Parcial                        | Enlace para saltar contenido, nombres accesibles, teclado, contraste y escala tipográfica.                        | Medir contraste, recorrer con lector de pantalla y documentar hallazgos.                              |
| RNF-05 | Seguridad                         | Implementado a nivel de código | Helmet, CORS, validación Zod, consultas parametrizadas, roles, cookies `HttpOnly`, `scrypt` y límites de payload. | Ejecutar auditoría de dependencias y pruebas básicas sobre el despliegue.                             |
| RNF-06 | Privacidad y minimización         | Implementado para el MVP       | La consulta pública no exige registro; la cuenta administrativa conserva correo, hash y sesiones opacas.          | Incorporar política de privacidad si se habilitan cuentas públicas o analítica.                       |
| RNF-07 | Calidad de datos                  | Parcial                        | Existen validaciones, staging, errores durables y 38 pruebas del scraper.                                         | Medir porcentajes sobre una muestra real y demostrar 95 % de campos obligatorios y 90 % normalizados. |
| RNF-08 | Trazabilidad de contenido         | Implementado                   | `sources`, `screenings`, `staging_records` y `content_assets` conservan origen, captura y condición de uso.       | Revisar una muestra real para confirmar que ninguna URL o condición quedó vacía.                      |
| RNF-09 | Mantenibilidad                    | Implementado                   | Monorepo TypeScript, contratos compartidos, módulos separados, migraciones, documentación y pruebas.              | Mantener este paquete sincronizado con cambios posteriores al commit de corte.                        |
| RNF-10 | Compatibilidad de navegadores     | Parcial                        | Construcción web estándar y pruebas jsdom.                                                                        | Definir matriz de navegadores y ejecutar recorrido en las versiones seleccionadas.                    |

## Trazabilidad por historia técnica

| Tarjeta | Resultado actual                           | Requisitos relacionados      | Evidencia principal                                                       |
| ------- | ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------- |
| KAN-01  | Normalización y control de duplicados      | RF-02, RF-08, RNF-07         | `normalizeScreening.ts`, pruebas y migraciones 002, 013 y 014.            |
| KAN-04  | Enriquecimiento de películas mediante TMDB | RF-06, RF-07, RNF-08         | Módulo `metadata`, migraciones 005 y 010, pruebas del cliente y servicio. |
| KAN-05  | Ficha y consulta de películas              | RF-03, RF-06, RF-11          | `MovieDetailView`, rutas y repositorio de catálogo.                       |
| KAN-06  | Esquema relacional                         | RF-07, RF-08, RNF-07, RNF-08 | `database/migrations` y diccionario de datos.                             |
| KAN-07  | Ingesta con staging y bitácora             | RF-01, RF-02, RF-08          | Módulo `ingestion`, tablas de ejecución, staging y errores.               |
| KAN-08  | Vistas del frontend                        | RF-03 a RF-06                | `HomeView`, `CatalogView`, `MovieDetailView` y pruebas.                   |
| KAN-09  | Base accesible y responsive                | RNF-03, RNF-04               | `SiteChrome`, estilos, preferencias visuales y pruebas.                   |
| KAN-10  | Conectores por fuente                      | RF-01, RNF-09                | `scraper/src/connectors` y pruebas con fixtures.                          |

## Cambios obligatorios antes del cierre

1. Resolver o replanificar RF-09.
2. Corregir el criterio temporal de RF-10 y agregar su prueba.
3. Ejecutar MySQL, carga, auditoría y pruebas SUS.
4. Actualizar esta matriz si el commit de entrega cambia.
