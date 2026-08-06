# Contrato de normalización de funciones

El módulo `scraper` acepta datos crudos provenientes de sitios web, calendarios, redes sociales,
cargas manuales o API. Ningún conector escribe directamente en las tablas publicadas.

## Entrada mínima

Cada registro debe incluir:

- título de la película;
- nombre de la sala;
- `startsAt` con zona horaria, o bien `screeningDate` y `screeningTime`;
- URL y tipo de fuente.

Opcionalmente puede incluir una clave propia de la fuente, zona horaria, idioma, formato y fecha
de captura.

## Salida normalizada

Los registros aceptados contienen:

- título y sala sin espacios ni caracteres invisibles innecesarios;
- claves canónicas comparables para película y sala;
- fecha `YYYY-MM-DD` y horario `HH:MM`;
- instante UTC en `startsAt` y zona horaria original;
- clave de duplicación formada por película, sala e instante de inicio;
- URL, tipo de fuente y fecha de captura.

Los alias de salas se inyectan desde configuración. Así se evita incorporar decisiones específicas
de una fuente dentro del normalizador común.

## Rechazos y duplicados

`safeNormalizeScreening` conserva el registro crudo, la fecha de captura y una lista de problemas
por campo. `normalizeScreenings` procesa lotes, separa registros aceptados, rechazados y
duplicados, y entrega un resumen cuantificable.

Los duplicados se normalizan para poder identificarlos, pero no se publican dos veces. La tasa de
normalización corresponde a los registros que alcanzaron el contrato, incluyendo los duplicados
detectados.

## Criterios cubiertos por KAN-1

- normalización de espacios, caracteres invisibles, fechas, horarios y claves;
- separación explícita entre fecha, horario e instante UTC;
- validación de campos obligatorios y zona horaria;
- trazabilidad de fuente y captura;
- conservación de rechazos con motivos;
- detección determinista de duplicados;
- lote de prueba con tasa de normalización igual al 90 %.
