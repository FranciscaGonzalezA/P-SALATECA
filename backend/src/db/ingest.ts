import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { z } from 'zod';
import { parseCsvCandidates, parseJsonCandidates } from '../modules/ingestion/fileParser.js';
import { ingestScreenings } from '../modules/ingestion/ingestion.service.js';
import { MysqlIngestionRepository } from '../modules/ingestion/mysqlIngestionRepository.js';

const sourceTypeSchema = z.enum(['website', 'calendar', 'social_media', 'manual', 'api']);

function optionValue(argumentsList: readonly string[], name: string): string | undefined {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}

const argumentsList = process.argv.slice(2);
const filename = argumentsList[0];

if (!filename) {
  throw new Error(
    'Uso: pnpm db:ingest -- <archivo.json|csv> --source-name <nombre> --source-type <tipo> --base-url <url>',
  );
}

const source = z
  .object({
    name: z.string().trim().min(1),
    type: sourceTypeSchema,
    baseUrl: z.string().url(),
  })
  .parse({
    name: optionValue(argumentsList, '--source-name'),
    type: optionValue(argumentsList, '--source-type'),
    baseUrl: optionValue(argumentsList, '--base-url'),
  });
const absoluteFilename = resolve(process.cwd(), filename);
const content = await readFile(absoluteFilename, 'utf8');
const extension = extname(absoluteFilename).toLocaleLowerCase('en');
const records =
  extension === '.json'
    ? parseJsonCandidates(content)
    : extension === '.csv'
      ? parseCsvCandidates(content)
      : (() => {
          throw new Error('El cargador acepta únicamente archivos JSON o CSV.');
        })();

const result = await ingestScreenings(new MysqlIngestionRepository(), {
  source,
  records,
});

console.info(JSON.stringify(result, null, 2));
