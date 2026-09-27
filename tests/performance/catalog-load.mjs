const apiBaseUrl = process.env.QA_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    'Define QA_BASE_URL con la raíz de la API de pruebas, por ejemplo http://127.0.0.1:3000/api/v1.',
  );
}

const target = new URL(apiBaseUrl);
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(target.hostname);
if (!isLocal && process.env.QA_ALLOW_REMOTE !== 'true') {
  throw new Error(
    'La prueba de carga solo apunta a localhost. Usa QA_ALLOW_REMOTE=true únicamente en un ambiente QA autorizado.',
  );
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return value;
}

const users = positiveInteger('QA_USERS', 20);
const requestsPerUser = positiveInteger('QA_REQUESTS_PER_USER', 5);
const timeoutMs = positiveInteger('QA_TIMEOUT_MS', 5_000);
const p95LimitMs = positiveInteger('QA_P95_LIMIT_MS', 1_500);
const endpoint = new URL(
  'cartelera?pagina=1&limite=12&buscar=cine',
  `${target.toString().replace(/\/$/, '')}/`,
);

async function measureRequest() {
  const startedAt = performance.now();
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

await measureRequest();

const results = (
  await Promise.all(
    Array.from({ length: users }, async () => {
      const userResults = [];
      for (let requestIndex = 0; requestIndex < requestsPerUser; requestIndex += 1) {
        userResults.push(await measureRequest());
      }
      return userResults;
    }),
  )
).flat();

const durations = results.map((result) => result.durationMs).sort((left, right) => left - right);
const percentile = (ratio) => durations[Math.ceil(durations.length * ratio) - 1] ?? 0;
const failures = results.filter((result) => !result.ok);
const summary = {
  target: endpoint.toString(),
  users,
  requests: results.length,
  successful: results.length - failures.length,
  failed: failures.length,
  latencyMs: {
    min: Number((durations[0] ?? 0).toFixed(2)),
    median: Number(percentile(0.5).toFixed(2)),
    p95: Number(percentile(0.95).toFixed(2)),
    max: Number((durations.at(-1) ?? 0).toFixed(2)),
  },
  statusCodes: Object.fromEntries(
    [...new Set(results.map((result) => result.status))].map((status) => [
      status,
      results.filter((result) => result.status === status).length,
    ]),
  ),
  acceptance: {
    noFailures: failures.length === 0,
    p95WithinLimit: percentile(0.95) <= p95LimitMs,
    p95LimitMs,
  },
};

console.info(JSON.stringify(summary, null, 2));

if (!summary.acceptance.noFailures || !summary.acceptance.p95WithinLimit) {
  process.exitCode = 1;
}
