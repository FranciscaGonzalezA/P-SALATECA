# Despliegue en cPanel (Tecnoinver)

Dominios de producción:

- Frontend: `https://salateca.rpayweb.cl`
- API: `https://api.rpayweb.cl`

## Aplicación Node.js

Crear la aplicación con Node.js 24, modo `Production`, raíz `salateca-api`, URL
`api.rpayweb.cl` y archivo de inicio `app.js`.

Variables mínimas:

```text
FRONTEND_ORIGIN=https://salateca.rpayweb.cl
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=<nombre completo generado por cPanel>
MYSQL_USER=<usuario completo generado por cPanel>
MYSQL_PASSWORD=<secreto configurado en cPanel>
MYSQL_CONNECTION_LIMIT=5
ADMIN_EMAIL=<correo del administrador>
ADMIN_PASSWORD=<contraseña segura de 12 o más caracteres>
```

`NODE_ENV=production` lo establece el modo de aplicación de cPanel. No se debe
guardar ninguna contraseña en el ZIP.

Extraer `release/cpanel/salateca-api.zip` directamente en
`/home/lprimacl/salateca-api`, ejecutar **Run NPM Install** desde la aplicación
Node.js y reiniciarla. `app.js` aplica las migraciones pendientes antes de
iniciar la API.

## Frontend

Extraer el contenido de `release/cpanel/salateca-frontend.zip` directamente en
`/home/lprimacl/public_html/salateca.rpayweb.cl`. El paquete ya contiene la URL
de la API de producción y una regla `.htaccess` para las rutas de React.

## SSL

Cuando AutoSSL haya emitido certificados para ambos subdominios, activar
**Force HTTPS Redirect** y comprobar `/api/v1/health` y la portada del frontend.
