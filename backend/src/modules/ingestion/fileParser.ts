import type { IngestionCandidate } from './ingestion.types.js';

function toCandidate(record: unknown): IngestionCandidate {
  if (
    typeof record === 'object' &&
    record !== null &&
    'rawPayload' in record &&
    'normalizedPayload' in record
  ) {
    return {
      rawPayload: record.rawPayload,
      normalizedPayload: record.normalizedPayload,
    };
  }

  return {
    rawPayload: record,
    normalizedPayload: record,
  };
}

export function parseJsonCandidates(content: string): IngestionCandidate[] {
  const parsed: unknown = JSON.parse(content);
  const records =
    typeof parsed === 'object' &&
    parsed !== null &&
    'records' in parsed &&
    Array.isArray(parsed.records)
      ? parsed.records
      : parsed;

  if (!Array.isArray(records)) {
    throw new Error('El JSON debe ser un arreglo o un objeto con un arreglo records.');
  }

  return records.map(toCandidate);
}

export function parseCsvRows(content: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += character;
  }

  if (quoted) {
    throw new Error('El CSV contiene un campo entre comillas sin cerrar.');
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }

  const header = rows.shift()?.map((value) => value.replace(/^\uFEFF/, '').trim());
  if (!header?.length || header.some((value) => value === '')) {
    throw new Error('El CSV no contiene una cabecera válida.');
  }
  if (new Set(header).size !== header.length) {
    throw new Error('El CSV contiene columnas duplicadas.');
  }

  return rows.map((values, rowIndex) => {
    if (values.length !== header.length) {
      throw new Error(`La fila ${rowIndex + 2} no tiene la cantidad de columnas esperada.`);
    }

    return Object.fromEntries(
      header.flatMap((column, index) => {
        const value = values[index]?.trim() ?? '';
        return value === '' ? [] : [[column, value]];
      }),
    );
  });
}

export function parseCsvCandidates(content: string): IngestionCandidate[] {
  return parseCsvRows(content).map(toCandidate);
}
