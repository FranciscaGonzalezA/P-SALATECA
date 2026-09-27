# Gestión del proyecto y configuración

## Metodología aplicada

El proyecto utiliza una metodología híbrida: planificación y documentación por hitos, desarrollo
incremental y seguimiento visual mediante Kanban. Para esta segunda vista, cada tarjeta debe
relacionarse con un requisito, un cambio versionado y una evidencia verificable.

## Tablero Kanban reconstruido al corte

Este cuadro representa el estado verificable en el repositorio. Debe replicarse o contrastarse
con el tablero oficial y adjuntar una captura fechada.

| Pendiente                     | En desarrollo                        | En revisión                                 | Finalizado                  |
| ----------------------------- | ------------------------------------ | ------------------------------------------- | --------------------------- |
| KAN-12: integración MySQL QA  | KAN-11: paquete de evidencias Hito 2 | KAN-16: estabilizar `pnpm quality`          | KAN-01: normalización       |
| KAN-13: prueba SUS            | KAN-15: corregir vigencia por hora   | KAN-17: decidir alcance CRUD administrativo | KAN-04: TMDB                |
| KAN-14: carga con 20 usuarios |                                      |                                             | KAN-05: detalle de película |
| KAN-18: WCAG y navegadores    |                                      |                                             | KAN-06: modelo relacional   |
|                               |                                      |                                             | KAN-07: ingesta y staging   |
|                               |                                      |                                             | KAN-08: vistas principales  |
|                               |                                      |                                             | KAN-09: base accesible      |
|                               |                                      |                                             | KAN-10: conectores          |

## Definición de terminado

Una tarjeta puede pasar a **Finalizado** cuando cumple todas estas condiciones:

- criterio de aceptación satisfecho;
- código formateado, analizado y compilado;
- prueba automatizada o procedimiento manual registrado;
- documentación actualizada;
- commit identificable;
- evidencia sin secretos ni datos personales.

## Control de versiones observado

| Elemento             | Evidencia al corte                                        | Evaluación                                                          |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Rama estable         | `main`                                                    | Existe localmente.                                                  |
| Rama de integración  | `develop`                                                 | Existe; la rama del corte está dos commits por delante.             |
| Rama del hito        | `codex/sin-validacion-manual-tmdb`                        | Contiene el estado evaluado.                                        |
| Historial            | 43 commits de una autora                                  | Evidencia evolución incremental.                                    |
| Convención           | Conventional Commits en la mayoría del historial reciente | Adecuada, pero faltan identificadores Kanban.                       |
| Integración continua | `.github/workflows/quality.yml`                           | Ejecuta instalación, calidad y auditoría en `main` y pull requests. |
| Remoto               | No configurado en la copia revisada                       | Debe configurarse o demostrarse desde el repositorio oficial.       |
| Tags/releases        | No existen tags locales                                   | Crear un tag del hito después de aprobar la entrega.                |

## Brechas de trazabilidad de gestión

1. Los documentos mencionan tarjetas `KAN-*`, pero los commits no incluyen esos identificadores.
2. No hay exportación fechada del tablero oficial dentro del repositorio.
3. La copia local no permite verificar pull requests, revisiones ni ejecución remota del workflow.
4. No existe un tag que inmovilice la versión correspondiente al segundo hito.

## Evidencias recomendadas

- captura completa del tablero con fecha y columnas visibles;
- exportación CSV o PDF del tablero, si la herramienta lo permite;
- enlace o captura del repositorio remoto y la rama del hito;
- captura del historial de commits;
- captura de una ejecución aprobada del workflow;
- tag sugerido: `hito-2-2026-09` una vez aprobadas las puertas de calidad;
- matriz de trazabilidad actualizada con el hash definitivo.

## Plan inmediato

| Prioridad | Tarea                           | Criterio de término                                           | Evidencia                            |
| --------: | ------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
|         1 | Estabilizar `pnpm quality`      | Comando completo termina con código 0 dos veces consecutivas. | Salida guardada y workflow aprobado. |
|         2 | Corregir RF-10                  | No se muestran funciones cuyo instante ya pasó.               | Prueba de repositorio y captura.     |
|         3 | Resolver RF-09                  | CRUD implementado o alcance formalmente ajustado.             | Historia, decisión y demostración.   |
|         4 | Ejecutar MySQL QA               | Migraciones idempotentes, seed e ingesta correctos.           | Bitácora SQL y respuestas API.       |
|         5 | Ejecutar pruebas no funcionales | p95 dentro de umbral y SUS mayor o igual a 75.                | Reportes de carga y usabilidad.      |
|         6 | Congelar la entrega             | Commit final, pull request y tag identificables.              | URL/captura del remoto.              |
