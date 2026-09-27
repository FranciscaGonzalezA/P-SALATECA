# Segunda Vista del Prototipo

## Paquete de evidencias del Hito 2

**Proyecto:** Salateca - plataforma para centralizar la oferta de cine arte local<br>
**Responsable:** María Francisca González Abarca<br>
**Fecha de corte:** 22 de septiembre de 2026<br>
**Rama evaluada:** `codex/sin-validacion-manual-tmdb`<br>
**Commit de corte:** `fbbb39b`

## Propósito

Este paquete reúne la evidencia verificable del segundo hito del proyecto. Su objetivo es
demostrar el avance funcional del MVP, la evolución del modelo de datos y los componentes, y
la gestión de configuración. Los resultados pendientes se declaran explícitamente; no se
presentan como aprobadas pruebas que no se han ejecutado.

## Resumen ejecutivo

Salateca dispone de una iteración funcional compuesta por frontend React, API Express,
persistencia MySQL, proceso de ingesta y scraper con conectores independientes. El sistema
permite consultar una cartelera centralizada, aplicar filtros, revisar fichas de películas y
fuentes, administrar publicaciones, importar funciones desde Excel y proteger las operaciones
administrativas mediante autenticación y roles.

La revisión automatizada del corte verificó 253 pruebas aprobadas de forma aislada y una
compilación de producción exitosa. Las coberturas de backend, frontend y scraper superan sus
umbrales. La puerta agregada `pnpm quality` todavía no es reproducible en este equipo: al
ejecutar las tres suites de cobertura en paralelo, dos pruebas criptográficas superan el timeout
de cinco segundos. Este comportamiento está registrado como deuda técnica y no se oculta en
la evidencia.

El modelo persistente ya contiene 14 tablas y 14 migraciones. Es más amplio que el modelo
conceptual del informe inicial, por lo que los diagramas incluidos aquí representan la
implementación actual.

## Contenido del paquete

| Documento                                        | Propósito                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| [Matriz de trazabilidad](matriz-trazabilidad.md) | Relaciona requisitos, implementación, pruebas, evidencia y brechas.  |
| [Diagramas actualizados](diagramas.md)           | Casos de uso, componentes, secuencias y modelo entidad-relación.     |
| [Evidencia técnica](evidencia-tecnica.md)        | Registra estructura, comandos, resultados, cobertura y limitaciones. |
| [Gestión del proyecto](gestion-proyecto.md)      | Resume Kanban, ramas, commits, CI y pendientes de configuración.     |
| [Estructura de presentación](presentacion.md)    | Propone diez láminas con mensajes, evidencia y apoyo visual.         |
| [Guion de demostración](guion-demostracion.md)   | Orden sugerido para presentar el MVP y responder preguntas.          |
| [Lista de verificación](checklist-entrega.md)    | Control final de archivos, capturas y validaciones pendientes.       |

## Estado del hito

| Área evaluada              | Estado                       | Síntesis                                                                           |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| MVP funcional              | Avanzado con brechas         | Flujos públicos, ingesta y administración parcial implementados.                   |
| Modelo de datos            | Implementado y versionado    | 14 tablas, relaciones, restricciones e historial de migraciones.                   |
| Diagramas de soporte       | Actualizados en este paquete | Incluye casos de uso, componentes, secuencias y DER físico resumido.               |
| Pruebas automatizadas      | Aprobadas por paquete        | 253 casos y coberturas sobre los umbrales.                                         |
| Puerta agregada de calidad | Observada                    | Falla por timeout de `scrypt` bajo ejecución paralela.                             |
| MySQL real y rendimiento   | Pendiente                    | No hay Docker ni servicio MySQL disponible en el equipo revisado.                  |
| Usabilidad con usuarios    | Pendiente                    | Debe ejecutarse SUS con al menos cinco participantes.                              |
| Gestión ágil               | Parcial                      | Existe correspondencia Kanban, pero falta evidencia exportada del tablero oficial. |
| Control de versiones       | Implementado localmente      | 43 commits y ramas; falta configurar o evidenciar el remoto.                       |

## Criterio de presentación

La demostración debe concentrarse en capacidades observables y no en promesas. Los elementos
marcados como pendientes deben presentarse como trabajo planificado para la siguiente
iteración, con responsable, criterio de término y evidencia esperada.
