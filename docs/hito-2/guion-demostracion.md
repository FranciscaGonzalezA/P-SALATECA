# Guion de demostración del Hito 2

## Objetivo

Demostrar en aproximadamente 12 minutos que la iteración integra código funcional, datos
modelados y gestión de configuración. La presentación debe seguir una historia de usuario
completa y después mostrar la evidencia técnica que la sostiene.

## Preparación previa

- usar un commit identificado y un árbol Git limpio;
- preparar datos de demostración sin información personal;
- verificar frontend, API y base de datos antes de ingresar a la sala;
- mantener abierta una terminal con el resultado de pruebas y compilación;
- abrir el tablero Kanban y la matriz de trazabilidad;
- usar un navegador limpio y un viewport móvil preparado;
- disponer de un plan alternativo con capturas si falla la infraestructura.

## Secuencia sugerida

### 1. Problema y alcance - 1 minuto

> La cartelera de cine arte se encuentra fragmentada en múltiples fuentes. Salateca centraliza,
> normaliza y presenta esa información para facilitar su descubrimiento, conservando siempre el
> origen de los datos.

Indicar que esta iteración prioriza consulta, filtros, trazabilidad, ingesta y administración
operativa. No incluye venta de entradas ni reservas.

### 2. Recorrido del visitante - 3 minutos

1. Abrir la página de inicio.
2. Navegar a la cartelera.
3. Buscar una película por título o dirección.
4. Aplicar dos filtros combinados, por ejemplo sala y fecha.
5. Cambiar el orden de resultados.
6. Abrir el detalle de una película.
7. Señalar géneros, sala, fecha, fuente, última captura y enlace oficial.
8. Volver al catálogo conservando el contexto de navegación.

**Requisitos demostrados:** RF-03, RF-04, RF-05, RF-06, RF-07 y RF-11.

### 3. Accesibilidad y adaptación - 1 minuto

1. Activar alto contraste.
2. Cambiar la escala tipográfica.
3. Navegar con teclado por los controles principales.
4. Mostrar el menú y la cartelera en viewport móvil.

**Requisitos demostrados parcialmente:** RNF-03 y RNF-04. Aclarar que la revisión WCAG y el
lector de pantalla siguen pendientes.

### 4. Flujo administrativo e ingesta - 3 minutos

1. Iniciar sesión como administradora.
2. Mostrar que la sesión utiliza cookie protegida y autorización backend.
3. Importar una planilla controlada con:
   - una función válida;
   - una función duplicada;
   - una fila inválida.
4. Mostrar el resumen de aceptados, duplicados y rechazados.
5. Descargar o abrir el registro de errores.
6. Mostrar la validación de región de una sala pendiente.
7. Explicar el enriquecimiento posterior mediante TMDB sin exponer credenciales.

**Requisitos demostrados:** RF-01, RF-02, RF-08, RNF-05, RNF-07 y RNF-08.

### 5. Modelo de datos y componentes - 2 minutos

Mostrar `diagramas.md` y explicar:

- separación entre fuentes, scraper, staging, backend, base y frontend;
- razón del staging antes de publicar;
- relación entre película, sala, función y fuente;
- muchos-a-muchos entre películas y géneros;
- trazabilidad mediante corridas, registros y errores;
- autenticación mediante usuarios, sesiones y tokens de recuperación;
- 14 migraciones que versionan el esquema.

### 6. Gestión y calidad - 2 minutos

1. Mostrar el tablero y una tarjeta finalizada.
2. Relacionarla con un requisito de la matriz.
3. Mostrar el commit correspondiente.
4. Presentar las 253 pruebas aprobadas y las coberturas.
5. Mostrar la compilación de producción exitosa.
6. Declarar las brechas sin ocultarlas:
   - timeout de la puerta agregada;
   - CRUD administrativo parcial;
   - vigencia por hora;
   - MySQL QA, carga, SUS y WCAG pendientes.

## Cierre sugerido

> La segunda iteración demuestra que Salateca ya no es solo un diseño conceptual: cuenta con
> frontend, API, persistencia versionada, ingesta, conectores y pruebas. El siguiente ciclo se
> concentrará en cerrar las brechas administrativas y validar el producto en infraestructura
> real y con usuarios.

## Preguntas previsibles

### ¿Cómo evitan publicar datos incorrectos?

Los datos ingresan a staging, se validan y normalizan, y cada registro queda clasificado como
válido, rechazado o duplicado. Los errores se guardan con campo, código, mensaje y valor crudo.

### ¿Qué ocurre si una fuente cambia o deja de responder?

Cada fuente posee un conector independiente. El fallo se registra y no obliga a modificar todo el
sistema. La cartelera ya publicada permanece desacoplada de la disponibilidad inmediata de la
fuente.

### ¿Cómo se protege la administración?

El backend valida credenciales con hashes `scrypt`, emite sesiones opacas almacenadas como hash
y aplica autorización por rol. El frontend no es la autoridad de seguridad.

### ¿Por qué el modelo del informe cambió?

El modelo inicial era conceptual. La iteración incorporó necesidades verificadas durante el
desarrollo: staging, errores de ingesta, sesiones, recuperación, publicaciones, metadatos y
derechos de contenido. Las migraciones documentan esa evolución.

### ¿Está listo para producción?

No. Está listo como prototipo funcional del hito. Faltan validación con MySQL de QA, carga,
auditoría de dependencias, compatibilidad, WCAG y pruebas SUS.
