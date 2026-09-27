# Evidencia técnica del corte

## Identificación

| Dato                              | Valor                                  |
| --------------------------------- | -------------------------------------- |
| Fecha de revisión                 | 22 de septiembre de 2026               |
| Rama                              | `codex/sin-validacion-manual-tmdb`     |
| Commit                            | `fbbb39b`                              |
| Estado inicial y final de Git     | Árbol de trabajo limpio                |
| Monorepo                          | pnpm workspaces                        |
| Paquetes principales              | frontend, backend, scraper y contracts |
| Migraciones                       | 14                                     |
| Tablas creadas                    | 14                                     |
| Archivos fuente contabilizados    | 154                                    |
| Archivos de prueba contabilizados | 52                                     |
| Commits locales                   | 43                                     |

## Componentes implementados

### Frontend

- inicio, cartelera, publicaciones y detalle de película;
- búsqueda, filtros y cuatro opciones de orden;
- paginación y estados de carga, error y vacío;
- alto contraste, escala tipográfica, navegación por teclado y menú móvil;
- autenticación administrativa y recuperación de contraseña;
- edición de publicaciones, importación de funciones y validación regional de salas.

### Backend

- API versionada bajo `/api/v1`;
- catálogo, salas, géneros, películas y funciones;
- autenticación, sesiones opacas y autorización por rol;
- ingesta administrativa por Excel y entrada interna del scraper;
- staging, publicación transaccional y errores por registro;
- contenido editorial y enriquecimiento opcional mediante TMDB.

### Datos e ingesta

- 11 conectores habilitados por defecto y un conector opcional para Instagram mediante API;
- normalización de fechas, horarios, títulos, salas y zona horaria;
- control de registros inválidos y duplicados;
- trazabilidad hacia fuente, URL, captura y corrida de ingesta;
- MySQL con claves foráneas, restricciones, índices y migraciones ordenadas.

## Verificaciones ejecutadas

### Formato y análisis estático

| Comprobación        | Resultado                                          |
| ------------------- | -------------------------------------------------- |
| `pnpm format:check` | Aprobado                                           |
| `pnpm -r lint`      | Aprobado                                           |
| `pnpm build`        | Aprobado en contracts, scraper, backend y frontend |

### Pruebas y cobertura por paquete

| Paquete   | Archivos |   Casos | Sentencias |   Ramas | Funciones |  Líneas | Resultado                |
| --------- | -------: | ------: | ---------: | ------: | --------: | ------: | ------------------------ |
| Backend   |       25 |     137 |    88,95 % | 82,44 % |   94,26 % | 89,93 % | Aprobado                 |
| Frontend  |       23 |      78 |    87,69 % | 73,19 % |   85,54 % | 89,55 % | Aprobado                 |
| Scraper   |        4 |      38 |    95,36 % | 83,33 % |     100 % | 95,23 % | Aprobado                 |
| **Total** |   **52** | **253** |          - |       - |         - |       - | **Aprobado por paquete** |

Los tres paquetes superan los umbrales definidos en `docs/qa-strategy.md`.

## Incidencias verificadas

### H2-DEF-01: timeout en la puerta agregada de calidad

- **Severidad:** media.
- **Comando:** `pnpm quality`.
- **Observado:** dos pruebas de autenticación exceden 5 segundos mientras backend, frontend y
  scraper generan cobertura en paralelo.
- **Control:** `pnpm --filter backend test:coverage` aprueba 137 de 137 casos cuando se ejecuta
  aisladamente.
- **Impacto:** el pipeline agregado termina con código 1 aunque las suites individuales pasen.
- **Acción recomendada:** ejecutar coberturas secuencialmente en la puerta de calidad o definir
  un timeout justificado para las pruebas criptográficas; repetir el pipeline completo.

### H2-DEF-02: vigencia diaria incompleta

- **Severidad:** media.
- **Ubicación:** `backend/src/modules/catalog/mysqlCatalogRepository.ts`.
- **Observado:** se utiliza `screening_date >= CURRENT_DATE()`.
- **Impacto:** una función cuyo horario ya transcurrió durante el día actual puede continuar en
  el catálogo.
- **Acción recomendada:** comparar el instante completo o combinar fecha y hora con la zona
  horaria definida; añadir una prueba de regresión.

## Validaciones no ejecutadas

| Validación                       | Motivo                                                                                                   | Condición para ejecutarla                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Migraciones contra MySQL 8.4     | Docker y cliente MySQL no están disponibles en el equipo revisado.                                       | Disponer de base QA desechable.                           |
| Prueba real de 20 usuarios       | Requiere API conectada a MySQL con datos representativos.                                                | Levantar ambiente QA y ejecutar `pnpm qa:load`.           |
| Auditoría npm                    | La consulta envía el inventario de dependencias a un servicio externo y requiere autorización explícita. | Autorizar y ejecutar `pnpm qa:audit`.                     |
| SUS con cinco usuarios           | Requiere sesiones formales y consentimiento.                                                             | Aplicar pauta y consolidar resultados.                    |
| WCAG manual y lector de pantalla | Las pruebas automatizadas no sustituyen esta revisión.                                                   | Ejecutar recorrido especializado y registrar incidencias. |
| Compatibilidad multinavegador    | No existe una matriz cerrada de versiones objetivo.                                                      | Definir Chrome, Edge y navegador móvil objetivo.          |

## Evidencias que deben capturarse en el ambiente de presentación

1. Inicio con navegación y llamada a la cartelera.
2. Cartelera con filtros combinados y contador de resultados.
3. Detalle de película con fuente, captura y enlace oficial.
4. Panel protegido después de iniciar sesión.
5. Resumen de importación con registros aceptados, duplicados y rechazados.
6. Vista móvil y modo de alto contraste.
7. Consola con `pnpm quality` aprobado después de corregir H2-DEF-01.
8. Tablero Kanban y vista del historial de commits.
