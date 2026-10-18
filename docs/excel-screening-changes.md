# Cambios de horario y cancelaciones por Excel

La hoja `Cartelera` conserva sus cinco columnas obligatorias: `Fecha parseada`,
`Fecha texto`, `Pelicula`, `Sala` y `URL`. Se agregan dos columnas opcionales:

| Columna      | Uso                                                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ID funcion` | Identificador global elegido por el administrador, por ejemplo `normandie-2026-001`. De 1 a 100 caracteres ASCII: letras, números, `.`, `_`, `:`, `-`; empieza con letra o número. Distingue mayúsculas. No depende del horario, URL ni posición de la fila. |
| `Estado`     | Vacío conserva el estado; `programada` programa o reactiva explícitamente; `cancelada` cancela una función existente. Un estado explícito requiere ID.                                                                                                       |

## Procedimiento

1. Para una función nueva, asignar un ID único y conservarlo en futuras planillas.
2. Para vincular una función anterior, importar su película, sala y **horario original**
   con un ID. Se asigna el ID a la función existente sin duplicarla. Después se puede
   modificar el horario conservando ese ID. No es posible deducir cuál era la función
   anterior a partir de un horario nuevo sin identidad previa.
3. Para cambiar el horario, editar `Fecha parseada` y/o `Fecha texto` según corresponda;
   si ambas tienen valor deben coincidir. Se conserva la conversión America/Santiago a UTC.
4. Para cancelar, conservar la fila completa con su ID y escribir `cancelada`. La
   cancelación usa el ID, no el horario de esa fila. Un ID desconocido produce un error.
5. Para reactivar, importar la fila completa con el mismo ID y `programada`.

Omitir filas no cancela ni elimina funciones. Una planilla antigua sin ID mantiene la
identificación por película, sala y hora; cambiar su horario seguirá creando otra función.
Un estado vacío no reactiva funciones canceladas. Las canceladas quedan fuera del catálogo
público porque sus consultas ya filtran `status = 'scheduled'`.

Todas las filas que repiten un ID dentro de un archivo se rechazan. No se puede asignar
otro ID a una función identificada, reutilizarlo para otra película/sala ni mover una
función a un horario ya ocupado por otra función de esa película y sala. El índice único
de horario existente y el nuevo índice de ID protegen la persistencia; los errores SQL
por concurrencia se rechazan por fila mediante savepoint y se pueden reintentar.

## API e instalación futura

`POST /api/v1/admin/screenings/import` mantiene XLSX binario, autenticación administrativa,
validación de origen y respuesta con errores por fila. La respuesta agrega `cancelled`;
`updated` cuenta modificaciones y reactivaciones, `cancelled` solo transiciones a cancelada,
y `duplicates` incluye una cancelación repetida. La interfaz muestra ambos contadores.

El DTO normalizado agrega `stableId` y `status` opcionales (`scheduled` o `cancelled`).
La migración `015_screening_stable_id.sql` agrega un ID nullable con índice único; debe
aplicarse antes de usar esta versión del backend. No se ejecutó esta migración ni se
desplegó el cambio durante el desarrollo.

## Verificación local

`pnpm test`, `pnpm build` y `pnpm lint` verifican los fuentes. La prueba
`backend/src/screeningChanges.test.ts` recorre XLSX → HTTP → parser → servicio → repositorio
MySQL con una conexión SQL simulada, y cubre compatibilidad, vinculación, cambio de hora,
reintentos, omisión, cancelación, reactivación, conflictos, validación y errores parciales.
No prueba un motor MySQL real, concurrencia real ni interacción visual de navegador.
No se accede a la base configurada ni a datos de producción.
