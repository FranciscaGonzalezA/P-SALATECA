import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { scraperEnv } from './config.js';
import { createDefaultConnectors } from './connectors/defaultConnectors.js';
import { FetchHttpClient } from './http/httpClient.js';
import { BackendPublisher } from './runtime/backendPublisher.js';
import { assertCollectionThresholds, collectFromConnectors } from './runtime/collectionRunner.js';
import { startWeeklyScheduler } from './runtime/weeklyScheduler.js';

function optionValues(argumentsList: readonly string[], name: string): string[] {
  return argumentsList.flatMap((value, index) =>
    value === name && argumentsList[index + 1] ? [argumentsList[index + 1]!] : [],
  );
}

function optionValue(argumentsList: readonly string[], name: string): string | undefined {
  return optionValues(argumentsList, name)[0];
}

const argumentsList = process.argv.slice(2);
const scheduleMode = argumentsList.includes('--schedule');
const publish = argumentsList.includes('--publish') || scheduleMode;
const selectedSources = new Set(optionValues(argumentsList, '--source'));
const outputPath = optionValue(argumentsList, '--output');

const http = new FetchHttpClient({
  timeoutMs: scraperEnv.SCRAPER_REQUEST_TIMEOUT_MS,
  retries: scraperEnv.SCRAPER_REQUEST_RETRIES,
  userAgent: scraperEnv.SCRAPER_USER_AGENT,
});
const allConnectors = createDefaultConnectors(http, {
  nexoInstagramAccessToken: scraperEnv.NEXO_INSTAGRAM_ACCESS_TOKEN,
});
const connectors = selectedSources.size
  ? allConnectors.filter((connector) => selectedSources.has(connector.id))
  : allConnectors;

if (connectors.length === 0) {
  if (selectedSources.has('nexo_instagram') && !scraperEnv.NEXO_INSTAGRAM_ACCESS_TOKEN) {
    throw new Error('NEXO_INSTAGRAM_ACCESS_TOKEN es obligatorio para consultar Nexo Cinema.');
  }
  throw new Error(`No existe ninguna fuente para: ${[...selectedSources].join(', ')}.`);
}

async function execute(): Promise<void> {
  const report = await collectFromConnectors(connectors);
  console.info(
    JSON.stringify(
      { startedAt: report.startedAt, finishedAt: report.finishedAt, ...report.summary },
      null,
      2,
    ),
  );
  assertCollectionThresholds(
    report,
    Math.min(scraperEnv.SCRAPER_MIN_SUCCESSFUL_SOURCES, connectors.length),
    scraperEnv.SCRAPER_MIN_ACCEPTED_RECORDS,
  );

  const normalizedRecords = report.sources.flatMap((source) => source.normalization?.records ?? []);
  if (outputPath) {
    const absoluteOutput = resolve(process.cwd(), outputPath);
    await mkdir(dirname(absoluteOutput), { recursive: true });
    await writeFile(
      absoluteOutput,
      JSON.stringify({ records: normalizedRecords, report }, null, 2),
      'utf8',
    );
    console.info(`Resultado guardado en ${absoluteOutput}`);
  }

  if (publish) {
    if (!scraperEnv.SCRAPER_INGEST_TOKEN) {
      throw new Error('SCRAPER_INGEST_TOKEN es obligatorio para publicar en el backend.');
    }
    const publisher = new BackendPublisher(
      new URL(scraperEnv.SCRAPER_BACKEND_URL),
      scraperEnv.SCRAPER_INGEST_TOKEN,
    );
    for (const source of report.sources) {
      if (source.status !== 'succeeded' || source.rawRecords.length === 0) continue;
      const result = await publisher.publish(source);
      console.info(`[scraper:${source.id}] ingesta ${result.status}: ${JSON.stringify(result)}`);
    }
  }

  if (report.summary.failedSources > 0 && !scheduleMode) process.exitCode = 2;
}

if (scheduleMode) {
  if (scraperEnv.SCRAPER_RUN_ON_START) await execute();
  startWeeklyScheduler(
    {
      day: scraperEnv.SCRAPER_SCHEDULE_DAY,
      time: scraperEnv.SCRAPER_SCHEDULE_TIME,
      timezone: scraperEnv.SCRAPER_SCHEDULE_TIMEZONE,
    },
    execute,
  );
  console.info(
    `Scraper programado: ${scraperEnv.SCRAPER_SCHEDULE_DAY} ${scraperEnv.SCRAPER_SCHEDULE_TIME} (${scraperEnv.SCRAPER_SCHEDULE_TIMEZONE}).`,
  );
} else {
  await execute();
}
