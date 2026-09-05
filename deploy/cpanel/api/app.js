const { resolve } = require('node:path');

const applicationRoot = __dirname;

// The compiled backend expects to run from the monorepo's backend directory so
// it can locate database/migrations as a sibling directory.
process.chdir(resolve(applicationRoot, 'backend'));

// cPanel/Passenger may provide its assigned port through PORT. Keep the
// project's BACKEND_PORT setting as a fallback for compatible hosting panels.
if (process.env.PORT) {
  process.env.BACKEND_PORT = process.env.PORT;
}

// LiteSpeed loads the startup file through require(). Dynamic import keeps that
// startup synchronous while allowing the compiled ESM backend to initialize.
void (async () => {
  await import('./backend/dist/db/migrate.js');
  await import('./backend/dist/server.js');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
