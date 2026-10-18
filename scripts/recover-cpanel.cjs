// Recovery from local release artifacts only. Never connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(root, 'docs/recovery-manifest.json'))) {
  throw new Error('Recovery already performed; edit the recovered sources directly.');
}
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), s);
};
const json = (p, v) => write(p, JSON.stringify(v, null, 2) + '\n');
const files = (dir) =>
  fs
    .readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
// Keep the pre-recovery working files, including uncommitted operational changes.
for (const dir of ['backend/src', 'frontend/src', 'database/migrations'])
  for (const f of files(dir)) {
    const dest = `tmp/recovery/before/${f}`;
    if (!fs.existsSync(path.join(root, dest))) write(dest, read(f));
  }
for (const f of [
  'package.json',
  'pnpm-workspace.yaml',
  'backend/package.json',
  'backend/tsconfig.json',
  'frontend/index.html',
]) {
  if (!fs.existsSync(path.join(root, `tmp/recovery/before/${f}`)))
    write(`tmp/recovery/before/${f}`, read(f));
}
const recovered = [];
for (const f of files('tmp/recovery/api/backend/dist')) {
  if (!/\.(js|d\.ts)$/.test(f) || f.includes('/test/') || f.includes('scraperIngestion.routes'))
    continue;
  const relative = f.split('/backend/dist/')[1];
  const dest = `backend/src/${relative}`;
  let content = read(f).replace(/^\/\/# sourceMappingURL=.*$/gm, '');
  if (relative === 'app.js')
    content = content
      .split('\n')
      .filter((l) => !l.includes('createScraperIngestionRouter'))
      .join('\n');
  write(dest, content);
  recovered.push(dest);
  if (relative.endsWith('.js')) {
    const old = dest.replace(/\.js$/, '.ts');
    if (fs.existsSync(path.join(root, old))) fs.unlinkSync(path.join(root, old));
  }
}
for (const f of files('tmp/recovery/api/database/migrations'))
  write(`database/migrations/${path.basename(f)}`, read(f));
const asset = files('tmp/recovery/frontend/assets').find((f) => f.endsWith('.js'));
let bundle = read(asset);
const url = 'https://api.rpayweb.cl/api/v1';
const replacements = bundle.split('`' + url + '`').length - 1;
if (replacements !== 6) throw new Error(`Unexpected API references: ${replacements}`);
bundle = bundle.replaceAll('`' + url + '`', "(import.meta.env.VITE_API_BASE_URL || '/api/v1')");
write('frontend/src/recovered-salateca.js', bundle);
write(
  'frontend/src/styles.css',
  read(files('tmp/recovery/frontend/assets').find((f) => f.endsWith('.css'))),
);
write(
  'frontend/src/main.tsx',
  "// Recovered release runtime; original TSX was not present in the artifacts.\nimport './styles.css';\nimport './recovered-salateca.js';\n",
);
write(
  'frontend/index.html',
  read('tmp/recovery/frontend/index.html')
    .replace(/    <script[^\n]+\n/, '    <script type="module" src="/src/main.tsx"></script>\n')
    .replace(/    <link rel="stylesheet"[^\n]+\n/, ''),
);
fs.mkdirSync(path.join(root, 'frontend/public'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'tmp/recovery/frontend/favicon.png'),
  path.join(root, 'frontend/public/favicon.png'),
);
fs.unlinkSync(path.join(root, 'frontend/src/App.tsx'));
const backend = JSON.parse(read('backend/package.json'));
backend.dependencies = JSON.parse(read('tmp/recovery/api/package.json')).dependencies;
backend.scripts.dev = 'tsx watch src/server.js';
backend.scripts['db:migrate'] = 'tsx src/db/migrate.js';
backend.scripts['db:seed'] = 'tsx src/db/seed.js';
json('backend/package.json', backend);
const config = JSON.parse(read('backend/tsconfig.json'));
Object.assign(config.compilerOptions, { allowJs: true, checkJs: false, declaration: false });
config.include = ['src/**/*.ts', 'src/**/*.js'];
json('backend/tsconfig.json', config);
const pkg = JSON.parse(read('package.json'));
pkg.scripts.dev = 'pnpm --parallel --filter ./frontend --filter ./backend dev';
delete pkg.scripts['dev:scraper'];
for (const s of ['build', 'lint', 'test'])
  pkg.scripts[s] = `pnpm --filter backend --filter frontend ${s}`;
json('package.json', pkg);
write(
  'pnpm-workspace.yaml',
  read('pnpm-workspace.yaml').replace('  - scraper\n', '').replace('  - scraper\r\n', ''),
);
json('docs/recovery-manifest.json', {
  artifacts: ['release/cpanel/salateca-api.zip', 'release/cpanel/salateca-frontend.zip'].map(
    (p) => ({
      path: p,
      sha256: crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, p)))
        .digest('hex'),
    }),
  ),
  backendFiles: recovered,
  frontendArtifact: asset.replace('tmp/recovery/frontend/', ''),
  apiUrlReplacements: replacements,
  limitations: [
    'Original TypeScript and TSX sources absent; maps contain no sourcesContent.',
    'Frontend recovered as a bundled JavaScript module with bundled dependencies; original component boundaries, names and types unavailable.',
    'Original tests absent.',
  ],
});
