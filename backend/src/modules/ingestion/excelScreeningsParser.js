import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { classifyScreeningTitle } from './movieTitleClassifier.js';
const requiredHeaders = ['Fecha parseada', 'Fecha texto', 'Pelicula', 'Sala', 'URL'];
const optionalHeaders = ['ID funcion', 'Estado'];
const maxRows = 5_000;
const maxUrlLength = 2_048;
export class ExcelScreeningFileError extends Error {
  code;
  constructor(message, code = 'invalid_excel_file') {
    super(message);
    this.code = code;
    this.name = 'ExcelScreeningFileError';
  }
}
function cleanText(value) {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
function canonicalKey(value) {
  const key = cleanText(value)
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .normalize('NFC')
    .toLocaleLowerCase('es-CL')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '');
  if (key) return key;
  const digest = createHash('sha256').update(cleanText(value)).digest('hex').slice(0, 24);
  return `unicode-${digest}`;
}
function parseHttpUrl(value) {
  if (value.length > maxUrlLength) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
function rawSourceUrl(candidate) {
  if (
    typeof candidate.rawPayload !== 'object' ||
    candidate.rawPayload === null ||
    !('sourceUrl' in candidate.rawPayload) ||
    typeof candidate.rawPayload.sourceUrl !== 'string'
  ) {
    return null;
  }
  return candidate.rawPayload.sourceUrl;
}
function ingestionSourceFromUrl(url) {
  return {
    name: url.hostname
      .replace(/^www\./i, '')
      .toLocaleLowerCase('es-CL')
      .slice(0, 160),
    type: 'website',
    baseUrl: url.origin,
  };
}
export function inferExcelIngestionSource(records) {
  for (const candidate of records) {
    const value = rawSourceUrl(candidate);
    const url = value ? parseHttpUrl(value) : null;
    if (!url) continue;
    return ingestionSourceFromUrl(url);
  }
  return {
    name: 'Importación Excel administrativa',
    type: 'manual',
    baseUrl: 'salateca://admin/importaciones/excel',
  };
}
function cellText(cell) {
  if (cell.value instanceof Date) {
    const date = cell.value;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00`;
  }
  return cleanText(cell.text);
}
function validCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
function parseLocalDateTime(value) {
  const normalized = cleanText(value);
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
    normalized,
  );
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[T\s](\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
    normalized,
  );
  const match = iso ?? local;
  if (!match) return null;
  const year = Number(iso ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(iso ? match[3] : match[1]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!validCalendarDate(year, month, day) || hour > 23 || minute > 59) return null;
  return { year, month, day, hour, minute };
}
function partsTimestamp(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}
function timezoneParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  };
}
function sameParts(left, right) {
  return Object.keys(left).every((key) => left[key] === right[key]);
}
function localToUtc(parts, timezone) {
  const targetTimestamp = partsTimestamp(parts);
  let candidateTimestamp = targetTimestamp;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const current = timezoneParts(new Date(candidateTimestamp), timezone);
    const adjustment = targetTimestamp - partsTimestamp(current);
    candidateTimestamp += adjustment;
    if (adjustment === 0) break;
  }
  const candidate = new Date(candidateTimestamp);
  if (!sameParts(timezoneParts(candidate, timezone), parts)) {
    throw new Error('La fecha y hora no existe en la zona horaria configurada.');
  }
  return candidate.toISOString();
}
function dateTimeLabel(parts) {
  return {
    date: `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
  };
}
function issue(field, code, message, rawValue) {
  return { field, code, message, rawValue };
}
function parseRowDate(parsedValue, textValue, issues) {
  const parsedDate = parsedValue ? parseLocalDateTime(parsedValue) : null;
  const textDate = textValue ? parseLocalDateTime(textValue) : null;
  if (!parsedValue && !textValue) {
    issues.push(
      issue('Fecha parseada', 'required', 'Debe informar Fecha parseada o Fecha texto.', null),
    );
    return null;
  }
  if (parsedValue && !parsedDate && textValue && !textDate) {
    issues.push(
      issue(
        'Fecha parseada',
        'invalid_datetime',
        'La fecha debe usar YYYY-MM-DD HH:MM:SS o DD/MM/YYYY HH:MM.',
        parsedValue,
      ),
      issue(
        'Fecha texto',
        'invalid_datetime',
        'La fecha debe usar YYYY-MM-DD HH:MM:SS o DD/MM/YYYY HH:MM.',
        textValue,
      ),
    );
    return null;
  }
  if (parsedValue && !parsedDate && !textDate) {
    issues.push(
      issue(
        'Fecha parseada',
        'invalid_datetime',
        'La fecha debe usar YYYY-MM-DD HH:MM:SS o DD/MM/YYYY HH:MM.',
        parsedValue,
      ),
    );
    return null;
  }
  if (textValue && !textDate && !parsedDate) {
    issues.push(
      issue(
        'Fecha texto',
        'invalid_datetime',
        'La fecha debe usar YYYY-MM-DD HH:MM:SS o DD/MM/YYYY HH:MM.',
        textValue,
      ),
    );
    return null;
  }
  if (parsedDate && textDate && !sameParts(parsedDate, textDate)) {
    issues.push(
      issue(
        'Fecha texto',
        'date_mismatch',
        'Fecha parseada y Fecha texto representan horarios distintos.',
        textValue,
      ),
    );
    return null;
  }
  return parsedDate ?? textDate;
}
export async function parseExcelScreenings(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new ExcelScreeningFileError('El archivo no es un libro XLSX válido.');
  }
  const sheet = workbook.getWorksheet('Cartelera');
  if (!sheet) {
    throw new ExcelScreeningFileError('El libro debe contener una hoja llamada “Cartelera”.');
  }
  const headerIndexes = new Map();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = cellText(cell);
    if (headerIndexes.has(header)) {
      throw new ExcelScreeningFileError(`La columna “${header}” está repetida.`);
    }
    headerIndexes.set(header, columnNumber);
  });
  const missing = requiredHeaders.filter((header) => !headerIndexes.has(header));
  if (missing.length > 0) {
    throw new ExcelScreeningFileError(`Faltan columnas obligatorias: ${missing.join(', ')}.`);
  }
  const timezone = options.timezone ?? 'America/Santiago';
  const capturedAt = (options.now ?? (() => new Date()))().toISOString();
  const records = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Object.fromEntries(
      [...requiredHeaders, ...optionalHeaders].map((header) => [
        header,
        headerIndexes.has(header) ? cellText(row.getCell(headerIndexes.get(header))) : '',
      ]),
    );
    if (Object.values(values).every((value) => value === '')) return;
    if (records.length >= maxRows) {
      throw new ExcelScreeningFileError(`El archivo admite un máximo de ${maxRows} funciones.`);
    }
    const issues = [];
    const stableId = values['ID funcion'];
    const state = values.Estado.toLocaleLowerCase('es-CL');
    if (stableId && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(stableId)) {
      issues.push(
        issue(
          'ID funcion',
          'invalid_id',
          'Usa hasta 100 caracteres: letras sin acentos, números, punto, guion, guion bajo o dos puntos.',
          stableId,
        ),
      );
    }
    if (state && !['programada', 'cancelada'].includes(state)) {
      issues.push(
        issue('Estado', 'invalid_status', 'Estado debe ser programada o cancelada.', state),
      );
    }
    if (state && !stableId) {
      issues.push(
        issue(
          'ID funcion',
          'required',
          'Para indicar Estado debes informar un ID funcion estable.',
          stableId,
        ),
      );
    }
    const suppliedMovieTitle = cleanText(values.Pelicula);
    const titleClassification = classifyScreeningTitle(suppliedMovieTitle);
    const movieTitle =
      titleClassification.kind === 'movie' ? titleClassification.title : suppliedMovieTitle;
    const venueName = cleanText(values.Sala);
    const sourceUrl = cleanText(values.URL);
    const parsedSourceUrl = parseHttpUrl(sourceUrl);
    if (!movieTitle) {
      issues.push(issue('Pelicula', 'required', 'La película es obligatoria.', values.Pelicula));
    } else if (titleClassification.kind === 'activity') {
      issues.push(
        issue(
          'Pelicula',
          'non_movie_activity',
          'La fila corresponde a una actividad y no a una película.',
          values.Pelicula,
        ),
      );
    } else if (movieTitle.length > 255) {
      issues.push(
        issue('Pelicula', 'too_long', 'La película no puede superar 255 caracteres.', movieTitle),
      );
    }
    if (!venueName) {
      issues.push(issue('Sala', 'required', 'La sala es obligatoria.', values.Sala));
    } else if (venueName.length > 180) {
      issues.push(issue('Sala', 'too_long', 'La sala no puede superar 180 caracteres.', venueName));
    }
    if (!parsedSourceUrl) {
      issues.push(
        issue(
          'URL',
          sourceUrl.length > maxUrlLength ? 'too_long' : 'invalid_url',
          sourceUrl.length > maxUrlLength
            ? `La URL no puede superar ${maxUrlLength} caracteres.`
            : 'La URL debe comenzar con http:// o https://.',
          sourceUrl,
        ),
      );
    }
    const parts = parseRowDate(values['Fecha parseada'], values['Fecha texto'], issues);
    const rawPayload = { rowNumber, ...values, sourceUrl };
    let normalizedPayload = {};
    if (parts && issues.length === 0) {
      const labels = dateTimeLabel(parts);
      try {
        const startsAt = localToUtc(parts, timezone);
        const movieKey = canonicalKey(movieTitle);
        const venueKey = canonicalKey(venueName);
        normalizedPayload = {
          ...(stableId ? { stableId } : {}),
          ...(state ? { status: state === 'cancelada' ? 'cancelled' : 'scheduled' } : {}),
          movieTitle,
          venueName,
          movieKey,
          venueKey,
          screeningDate: labels.date,
          screeningTime: labels.time,
          startsAt,
          sourceTimezone: timezone,
          sourceUrl,
          sourceType: 'website',
          sourceRecordKey: `excel-row-${rowNumber}`,
          capturedAt,
          duplicateKey: `${movieKey}:${venueKey}:${startsAt}`,
        };
      } catch (error) {
        issues.push(
          issue(
            'Fecha parseada',
            'invalid_datetime',
            error instanceof Error ? error.message : 'La fecha y hora no es válida.',
            values['Fecha parseada'] || values['Fecha texto'],
          ),
        );
      }
    }
    records.push({
      rawPayload,
      normalizedPayload,
      ...(parsedSourceUrl ? { source: ingestionSourceFromUrl(parsedSourceUrl) } : {}),
      rowNumber,
      ...(issues.length > 0 ? { validationIssues: issues } : {}),
    });
  });
  if (records.length === 0) {
    throw new ExcelScreeningFileError('La hoja Cartelera no contiene filas para importar.');
  }
  const counts = new Map();
  for (const record of records) {
    const id = record.rawPayload['ID funcion'];
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const record of records) {
    const id = record.rawPayload['ID funcion'];
    if (id && counts.get(id) > 1) {
      record.validationIssues = [
        ...(record.validationIssues ?? []),
        issue(
          'ID funcion',
          'duplicate_id',
          'El ID funcion está repetido en la planilla; usa una sola fila por función.',
          id,
        ),
      ];
    }
  }
  return records;
}
