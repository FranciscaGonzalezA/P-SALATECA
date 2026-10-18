# Operación y criterios de aceptación

## Despliegue

Ejecutar CI y construir `docker build -f backend/Dockerfile -t cine-arte-api:VERSION .`
desde la raíz. Inyectar secretos en ejecución; no incluir `.env` en la imagen.
Establecer MYSQL_HOST según la red del despliegue. La imagen solo ejecuta API:
las migraciones se ejecutan por separado desde el repositorio con credenciales dedicadas.
El puerto interno es 3000 por defecto; si cambia, adaptar la sonda Docker.
Usar proxy con HTTPS, límites de cuerpo, plazo de conexión y limitador compartido.
No habilitar trust proxy sin conocer y restringir los proxies de confianza.
El límite local por IP no es protección DDoS. Restringir acceso a las sondas en el proxy.

El usuario de ejecución no debe tener permisos DDL; usar otro para migraciones.
Para DB remota, configurar y validar TLS antes de transmitir credenciales.
El pool actual está preparado para una conexión local o una red privada protegida;
no acredita cifrado del enlace MySQL. Configurar cifrado de disco y secretos en el proveedor.

## Migraciones y recuperación

Respaldar antes de migrar. Ejecutar un único migrador durante una ventana controlada:
el runner actual no bloquea procesos concurrentes y DDL MySQL puede hacer commit implícito.
No asumir rollback transaccional del archivo completo. Si falla, detener el despliegue,
inspeccionar el esquema y restaurar o aplicar una reparación revisada antes de reintentar.
No cambiar archivos ya aplicados. Preferir cambios aditivos compatibles con la versión anterior.
Conservar imagen anterior; verificar readiness al desplegar y revertir la imagen si falla.
Las migraciones destructivas requieren respaldo y recuperación probada.

Programar respaldos cifrados fuera del servidor y comprobar restauración en una base aislada.
Objetivos iniciales propuestos, pendientes de aprobación y ensayo: RPO 24 h y RTO 4 h.
Registrar fecha, tamaño, resultado, tiempo de recuperación y responsable de cada ensayo.

## Observabilidad y respuesta

Recolectar logs JSON de la API con retención y acceso restringido. No registrar secretos.
Configurar monitor externo para disponibilidad y disponibilidad de DB mediante readiness.
Objetivos iniciales propuestos: disponibilidad 99.5 % mensual y p99 menor a 500 ms
para lecturas de catálogo futuras, excluyendo sondas. Medir solicitudes, errores 5xx,
latencia con histogramas, conexiones y cola DB, CPU y memoria. No existen aún exportador,
dashboards ni alertas; no afirmar SLO cumplido hasta medirlo.
Presupuesto de error: 0.5 % de solicitudes; acordar qué solicitudes son elegibles.
Alertar por fallo persistente de readiness, aumento de 5xx y saturación sostenida.

Ante incidente: asignar responsable, anotar hora UTC, impacto y request IDs; revisar
despliegue reciente y DB; mitigar mediante rollback o aislamiento; verificar recuperación.
Documentar causa, cronología, impacto, acciones con responsable y fecha en un postmortem.
Definir un responsable y suplente con canal de contacto antes de abrir producción.

## Validación pendiente

Probar con MySQL real: éxito, caída, recuperación y saturación del pool. Ejecutar carga
con concurrencia creciente y registrar throughput, p50/p95/p99, 429/503 y memoria.
Comprobar que memoria y conexiones se estabilizan y que no hay crecimiento de colas.
Ensayar SIGTERM, peticiones lentas, exceso de cuerpo, rollback y restauración.
Para futuras consultas usar parámetros, paginación y EXPLAIN; evitar N+1.
Para futuras ingestas definir idempotencia por clave, timeout, reintentos limitados con
backoff y jitter solo para fallos transitorios; no reintentar escrituras ambiguas sin deduplicación.
Validar URL y destino de red de conectores para impedir SSRF y redirecciones a redes privadas.
Antes de autenticación o escrituras definir autorización, CSRF según transporte de sesión
y pruebas de concurrencia e integridad. Comparar presupuesto y tráfico antes de agregar
réplicas, cachés compartidas, colas o Kubernetes.
