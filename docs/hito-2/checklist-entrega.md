# Lista de verificación de entrega

## Documentación incluida

- [x] Resumen ejecutivo y estado del hito.
- [x] Matriz de trazabilidad RF/RNF.
- [x] Casos de uso actualizados.
- [x] Diagrama de componentes.
- [x] Diagramas de secuencia.
- [x] DER alineado con las migraciones.
- [x] Evidencia técnica y cobertura.
- [x] Gestión de proyecto y tablero reconstruido.
- [x] Estructura de presentación de diez láminas.
- [x] Guion de demostración.
- [x] Limitaciones y trabajo pendiente declarados.

## Evidencia visual por incorporar

- [ ] Captura de inicio en escritorio.
- [ ] Captura de cartelera con filtros aplicados.
- [ ] Captura del detalle con fuente y URL oficial.
- [ ] Captura del panel administrativo autenticado.
- [ ] Captura del resultado de una importación controlada.
- [ ] Captura de alto contraste y viewport móvil.
- [ ] Captura fechada del tablero Kanban oficial.
- [ ] Captura del repositorio remoto, rama y commits.
- [ ] Captura del workflow aprobado.

## Controles técnicos antes de congelar la entrega

- [ ] Resolver H2-DEF-01 y ejecutar `pnpm quality` con código 0.
- [ ] Corregir H2-DEF-02 y añadir prueba de regresión.
- [ ] Decidir e informar el alcance definitivo de RF-09.
- [ ] Ejecutar migraciones dos veces en MySQL 8.4 para comprobar idempotencia.
- [ ] Ejecutar seed e ingesta de un lote válido, duplicado e inválido.
- [ ] Confirmar endpoints de salud, catálogo, detalle, salas y géneros.
- [ ] Ejecutar la prueba de carga con 20 usuarios.
- [ ] Ejecutar la auditoría de dependencias con autorización.
- [ ] Realizar recorrido de teclado, contraste y lector de pantalla.
- [ ] Aplicar SUS a cinco usuarios y consolidar resultados.
- [ ] Comprobar que `.env` y otras credenciales no estén versionadas.

## Gestión de configuración

- [ ] Configurar o verificar el remoto oficial.
- [ ] Incorporar identificadores Kanban en los commits futuros.
- [ ] Abrir pull request hacia `develop` o la rama definida por el curso.
- [ ] Adjuntar evidencia de revisión y workflow.
- [ ] Actualizar el hash de corte en todos los documentos.
- [ ] Crear el tag del hito después de aprobar las verificaciones.
- [ ] Exportar el tablero y conservarlo con la entrega.

## Control de la presentación

- [ ] Ensayar el guion en un máximo de 12 minutos.
- [ ] Preparar datos sin información personal ni secretos.
- [ ] Verificar conexión, navegador y resolución del proyector.
- [ ] Preparar capturas y resultados como respaldo offline.
- [ ] No declarar como aprobado ningún control pendiente.
- [ ] Diferenciar claramente prototipo funcional de producto listo para producción.

## Criterio de cierre

La entrega puede congelarse cuando las puertas automatizadas pasen, la versión esté identificada
en Git, las capturas correspondan al mismo commit y cada afirmación de cumplimiento tenga una
evidencia reproducible.
