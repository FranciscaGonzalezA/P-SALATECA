# Estructura de presentación

Propuesta de diez láminas para una exposición de 12 a 15 minutos. Cada lámina debe privilegiar
una evidencia visual y no más de cuatro ideas breves.

## Lámina 1 - Segunda Vista del Prototipo

**Título:** Salateca: cartelera centralizada de cine arte<br>
**Subtítulo:** Hito 2 - avance funcional, datos y configuración<br>
**Pie:** autora, asignatura, docente y fecha.

**Mensaje oral:** esta iteración transforma el diseño inicial en un sistema integrado y
verificable.

## Lámina 2 - Problema y objetivo del MVP

- cartelera fragmentada entre sitios, calendarios y redes sociales;
- formatos heterogéneos y actualización difícil de verificar;
- baja visibilidad de salas independientes;
- objetivo: centralizar, normalizar y facilitar el descubrimiento.

**Apoyo visual:** esquema fuente dispersa → Salateca → visitante.

## Lámina 3 - Alcance de la iteración

- consulta, búsqueda, filtros y detalle;
- ingesta, normalización y trazabilidad;
- autenticación y operaciones administrativas;
- publicaciones y enriquecimiento de películas.

**Declaración de alcance:** no incluye pagos, reservas ni cuentas obligatorias para visitantes.

## Lámina 4 - Historias y requisitos demostrados

| Flujo                             | Requisitos              |
| --------------------------------- | ----------------------- |
| Consultar y descubrir funciones   | RF-03 a RF-07 y RF-11   |
| Integrar y limpiar datos          | RF-01, RF-02 y RF-08    |
| Operación administrativa          | RF-09 parcial           |
| Calidad, seguridad y trazabilidad | RNF-05, RNF-08 y RNF-09 |

**Apoyo visual:** diagrama de casos de uso de `diagramas.md`.

## Lámina 5 - Prototipo funcional

Incluir cuatro capturas:

1. inicio;
2. cartelera filtrada;
3. detalle de película;
4. importación administrativa.

**Mensaje oral:** recorrer una historia completa desde la búsqueda hasta la verificación de la
fuente oficial.

## Lámina 6 - Arquitectura y componentes

- React para experiencia pública y administrativa;
- Express para API, reglas y autorización;
- scraper con conectores independientes;
- MySQL con staging, catálogo y trazabilidad;
- contratos TypeScript compartidos.

**Apoyo visual:** diagrama de componentes de `diagramas.md`.

## Lámina 7 - Modelo de datos

- 14 migraciones y 14 tablas;
- relación película-sala-función-fuente;
- géneros muchos-a-muchos;
- staging, corridas y errores de ingesta;
- sesiones, recuperación y contenidos editoriales.

**Apoyo visual:** DER implementado. Destacar las relaciones, no leer todos los atributos.

## Lámina 8 - Calidad del producto

| Paquete   | Pruebas | Cobertura de líneas |
| --------- | ------: | ------------------: |
| Backend   |     137 |             89,93 % |
| Frontend  |      78 |             89,55 % |
| Scraper   |      38 |             95,23 % |
| **Total** | **253** |                   - |

- formato y lint aprobados;
- compilación de producción aprobada;
- umbrales de cobertura aprobados por paquete.

**Nota oral:** declarar el timeout del comando agregado como incidencia abierta.

## Lámina 9 - Gestión y configuración

- 43 commits y ramas `main`, `develop` y rama del hito;
- workflow de calidad configurado;
- seguimiento Kanban por historias técnicas;
- migraciones y configuración versionadas;
- secretos excluidos mediante `.gitignore`.

**Apoyo visual:** captura del tablero y del historial del repositorio remoto.

## Lámina 10 - Brechas y próximo ciclo

1. estabilizar `pnpm quality`;
2. corregir la vigencia por hora de las funciones;
3. resolver el alcance del CRUD administrativo;
4. validar MySQL, rendimiento, WCAG y navegadores;
5. ejecutar SUS con cinco usuarios.

**Cierre:** el prototipo integrado está construido; la siguiente iteración se concentra en
validación real y cierre de requisitos parciales.

## Reglas visuales sugeridas

- utilizar una sola paleta coherente con la interfaz de Salateca;
- evitar párrafos extensos y mostrar una evidencia principal por lámina;
- usar tipografía mínima de 24 puntos para cuerpo y 32 para títulos;
- mantener el mismo nombre de RF, módulo y tarjeta en todos los artefactos;
- indicar “pendiente” o “parcial” directamente en la lámina cuando corresponda;
- incluir el hash del commit en la lámina final o en el pie de página.
