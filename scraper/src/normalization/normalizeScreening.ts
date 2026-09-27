import { z } from 'zod';
import type {
  DuplicateScreening,
  NormalizationBatchResult,
  NormalizationIssue,
  NormalizedScreening,
  RejectedScreening,
} from '../domain/screening.js';

export function normalizeWhitespace(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1');
}

export function createCanonicalKey(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const rawScreeningSchema = z.object({
  movieTitle: z.string().trim().min(1).transform(normalizeWhitespace),
  venueName: z.string().trim().min(1).transform(normalizeWhitespace),
  startsAt: z.string().trim().min(1).optional(),
  screeningDate: z.string().trim().min(1).optional(),
  screeningTime: z.string().trim().min(1).optional(),
  sourceTimezone: z.string().trim().min(1).optional(),
  sourceUrl: z.string().trim().url(),
  sourceType: z.enum(['website', 'calendar', 'social_media', 'manual', 'api']),
  sourceRecordKey: z.string().trim().min(1).optional(),
  capturedAt: z.string().datetime({ offset: true }).optional(),
  language: z.string().trim().min(1).transform(normalizeWhitespace).optional(),
  format: z.string().trim().min(1).transform(normalizeWhitespace).optional(),
});

const inputScreeningSchema = rawScreeningSchema.superRefine((value, context) => {
  const hasStartsAt = Boolean(value.startsAt);
  const hasSeparatedDateTime = Boolean(value.screeningDate && value.screeningTime);

  if (!hasStartsAt && !hasSeparatedDateTime) {
    context.addIssue({
      code: 'custom',
      message: 'Debe informar startsAt o la combinación screeningDate + screeningTime.',
      path: ['startsAt'],
    });
  }

  if (Boolean(value.screeningDate) !== Boolean(value.screeningTime)) {
    context.addIssue({
      code: 'custom',
      message: 'La fecha y el horario deben informarse juntos.',
      path: value.screeningDate ? ['screeningTime'] : ['screeningDate'],
    });
  }
});

export interface NormalizationOptions {
  defaultTimezone?: string | undefined;
  now?: (() => Date) | undefined;
  venueAliases?: Readonly<Record<string, string>> | undefined;
}

export class ScreeningNormalizationError extends Error {
  readonly issues: NormalizationIssue[];

  constructor(issues: NormalizationIssue[]) {
    super('El registro de función no cumple el contrato de normalización.');
    this.name = 'ScreeningNormalizationError';
    this.issues = issues;
  }
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function normalizeDate(value: string): string {
  const normalized = normalizeWhitespace(value);
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(normalized);
  const localMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(normalized);
  const match = isoMatch ?? localMatch;

  if (!match) {
    throw new ScreeningNormalizationError([
      {
        field: 'screeningDate',
        code: 'invalid_date',
        message: 'La fecha debe usar YYYY-MM-DD o DD/MM/YYYY.',
      },
    ]);
  }

  const year = Number(isoMatch ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(isoMatch ? match[3] : match[1]);

  if (!isValidCalendarDate(year, month, day)) {
    throw new ScreeningNormalizationError([
      {
        field: 'screeningDate',
        code: 'invalid_date',
        message: 'La fecha no existe en el calendario.',
      },
    ]);
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function normalizeTime(value: string): string {
  const normalized = normalizeWhitespace(value).toLocaleLowerCase('es-CL');
  const match = /^(\d{1,2})(?::|\.)(\d{2})(?::\d{2})?\s*(am|pm)?$/.exec(normalized);

  if (!match) {
    throw new ScreeningNormalizationError([
      {
        field: 'screeningTime',
        code: 'invalid_format',
        message: 'El horario debe usar HH:MM.',
      },
    ]);
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3];

  if (minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) {
    throw new ScreeningNormalizationError([
      {
        field: 'screeningTime',
        code: 'invalid_format',
        message: 'El horario está fuera del rango permitido.',
      },
    ]);
  }

  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  } else if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function parseDateAndTime(date: string, time: string): DateTimeParts {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new ScreeningNormalizationError([
      {
        field: 'startsAt',
        code: 'invalid_datetime',
        message: 'No fue posible construir la fecha y hora de la función.',
      },
    ]);
  }

  return { year, month, day, hour, minute };
}

function getPartsInTimezone(date: Date, timezone: string): DateTimeParts {
  let formatter: Intl.DateTimeFormat;

  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new ScreeningNormalizationError([
      {
        field: 'sourceTimezone',
        code: 'invalid_timezone',
        message: 'La zona horaria no es válida.',
      },
    ]);
  }

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

function partsToTimestamp(parts: DateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function sameDateTime(left: DateTimeParts, right: DateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function localDateTimeToUtc(date: string, time: string, timezone: string): string {
  const target = parseDateAndTime(date, time);
  const targetTimestamp = partsToTimestamp(target);
  let candidateTimestamp = targetTimestamp;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const candidateParts = getPartsInTimezone(new Date(candidateTimestamp), timezone);
    const adjustment = targetTimestamp - partsToTimestamp(candidateParts);
    candidateTimestamp += adjustment;

    if (adjustment === 0) {
      break;
    }
  }

  const candidate = new Date(candidateTimestamp);
  if (!sameDateTime(getPartsInTimezone(candidate, timezone), target)) {
    throw new ScreeningNormalizationError([
      {
        field: 'startsAt',
        code: 'invalid_datetime',
        message: 'La fecha y hora local no existe en la zona horaria indicada.',
      },
    ]);
  }

  return candidate.toISOString();
}

function getDisplayDateTime(
  startsAt: string,
  timezone: string,
): { screeningDate: string; screeningTime: string } {
  const instant = new Date(startsAt);

  if (Number.isNaN(instant.getTime())) {
    throw new ScreeningNormalizationError([
      {
        field: 'startsAt',
        code: 'invalid_datetime',
        message: 'startsAt debe representar una fecha y hora válida.',
      },
    ]);
  }

  const parts = getPartsInTimezone(instant, timezone);
  return {
    screeningDate: `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    screeningTime: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
  };
}

function normalizeDateTime(
  startsAt: string | undefined,
  screeningDate: string | undefined,
  screeningTime: string | undefined,
  timezone: string,
): { screeningDate: string; screeningTime: string; startsAt: string } {
  if (screeningDate && screeningTime) {
    const normalizedDate = normalizeDate(screeningDate);
    const normalizedTime = normalizeTime(screeningTime);
    return {
      screeningDate: normalizedDate,
      screeningTime: normalizedTime,
      startsAt: localDateTimeToUtc(normalizedDate, normalizedTime, timezone),
    };
  }

  if (!startsAt) {
    throw new ScreeningNormalizationError([
      {
        field: 'startsAt',
        code: 'required',
        message: 'Debe informar la fecha y hora de la función.',
      },
    ]);
  }

  const hasExplicitOffset = /(Z|[+-]\d{2}:\d{2})$/i.test(startsAt);
  if (hasExplicitOffset) {
    const explicitMatch =
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/i.exec(
        startsAt,
      );
    const year = Number(explicitMatch?.[1]);
    const month = Number(explicitMatch?.[2]);
    const day = Number(explicitMatch?.[3]);
    const hour = Number(explicitMatch?.[4]);
    const minute = Number(explicitMatch?.[5]);
    const second = Number(explicitMatch?.[6] ?? 0);
    const offsetHour = Number(explicitMatch?.[8] ?? 0);
    const offsetMinute = Number(explicitMatch?.[9] ?? 0);

    if (
      !explicitMatch ||
      !isValidCalendarDate(year, month, day) ||
      hour > 23 ||
      minute > 59 ||
      second > 59 ||
      offsetHour > 23 ||
      offsetMinute > 59
    ) {
      throw new ScreeningNormalizationError([
        {
          field: 'startsAt',
          code: 'invalid_datetime',
          message: 'startsAt debe representar una fecha y hora válida.',
        },
      ]);
    }

    const instant = new Date(startsAt);
    const display = getDisplayDateTime(startsAt, timezone);
    return {
      ...display,
      startsAt: instant.toISOString(),
    };
  }

  const localMatch = /^(\d{4}-\d{1,2}-\d{1,2})[T\s](\d{1,2}(?::|\.)(?:\d{2})(?::\d{2})?)$/.exec(
    startsAt,
  );

  if (!localMatch?.[1] || !localMatch[2]) {
    throw new ScreeningNormalizationError([
      {
        field: 'startsAt',
        code: 'invalid_datetime',
        message: 'startsAt debe incluir una zona horaria o usar fecha y hora local válidas.',
      },
    ]);
  }

  const normalizedDate = normalizeDate(localMatch[1]);
  const normalizedTime = normalizeTime(localMatch[2]);
  return {
    screeningDate: normalizedDate,
    screeningTime: normalizedTime,
    startsAt: localDateTimeToUtc(normalizedDate, normalizedTime, timezone),
  };
}

function resolveVenueName(
  venueName: string,
  aliases: Readonly<Record<string, string>> | undefined,
): string {
  if (!aliases) {
    return venueName;
  }

  const venueKey = createCanonicalKey(venueName);
  const match = Object.entries(aliases).find(([alias]) => createCanonicalKey(alias) === venueKey);
  return match ? normalizeWhitespace(match[1]) : venueName;
}

function mapZodIssues(error: z.ZodError): NormalizationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'record',
    code: issue.code === 'custom' ? 'required' : 'invalid_format',
    message: issue.message,
  }));
}

function getCapturedAt(
  input: unknown,
  parsedCapturedAt: string | undefined,
  options: NormalizationOptions,
): string {
  if (parsedCapturedAt) {
    return new Date(parsedCapturedAt).toISOString();
  }

  if (
    typeof input === 'object' &&
    input !== null &&
    'capturedAt' in input &&
    typeof input.capturedAt === 'string'
  ) {
    const candidate = new Date(input.capturedAt);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate.toISOString();
    }
  }

  return (options.now ?? (() => new Date()))().toISOString();
}

export function normalizeScreening(
  input: unknown,
  options: NormalizationOptions = {},
): NormalizedScreening {
  const result = inputScreeningSchema.safeParse(input);
  if (!result.success) {
    throw new ScreeningNormalizationError(mapZodIssues(result.error));
  }

  const parsed = result.data;
  const sourceTimezone = parsed.sourceTimezone ?? options.defaultTimezone ?? 'America/Santiago';
  const venueName = resolveVenueName(parsed.venueName, options.venueAliases);
  const dateTime = normalizeDateTime(
    parsed.startsAt,
    parsed.screeningDate,
    parsed.screeningTime,
    sourceTimezone,
  );
  const movieKey = createCanonicalKey(parsed.movieTitle);
  const venueKey = createCanonicalKey(venueName);
  const capturedAt = getCapturedAt(input, parsed.capturedAt, options);
  const duplicateKey = `${movieKey}:${venueKey}:${dateTime.startsAt}`;

  return {
    movieTitle: parsed.movieTitle,
    venueName,
    movieKey,
    venueKey,
    ...dateTime,
    sourceTimezone,
    sourceUrl: parsed.sourceUrl,
    sourceType: parsed.sourceType,
    ...(parsed.sourceRecordKey ? { sourceRecordKey: parsed.sourceRecordKey } : {}),
    capturedAt,
    ...(parsed.language ? { language: parsed.language } : {}),
    ...(parsed.format ? { format: parsed.format } : {}),
    duplicateKey,
  };
}

export type SafeNormalizationResult =
  { success: true; data: NormalizedScreening } | { success: false; rejection: RejectedScreening };

export function safeNormalizeScreening(
  input: unknown,
  options: NormalizationOptions = {},
): SafeNormalizationResult {
  try {
    return { success: true, data: normalizeScreening(input, options) };
  } catch (error) {
    const issues =
      error instanceof ScreeningNormalizationError
        ? error.issues
        : [
            {
              field: 'record',
              code: 'invalid_format' as const,
              message: 'No fue posible normalizar el registro.',
            },
          ];

    return {
      success: false,
      rejection: {
        input,
        capturedAt: getCapturedAt(input, undefined, options),
        issues,
      },
    };
  }
}

export function normalizeScreenings(
  inputs: readonly unknown[],
  options: NormalizationOptions = {},
): NormalizationBatchResult {
  const records: NormalizedScreening[] = [];
  const rejected: RejectedScreening[] = [];
  const duplicates: DuplicateScreening[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const result = safeNormalizeScreening(input, options);

    if (!result.success) {
      rejected.push(result.rejection);
      continue;
    }

    if (seen.has(result.data.duplicateKey)) {
      duplicates.push({
        input,
        capturedAt: result.data.capturedAt,
        duplicateKey: result.data.duplicateKey,
      });
      continue;
    }

    seen.add(result.data.duplicateKey);
    records.push(result.data);
  }

  const normalized = records.length + duplicates.length;
  const processed = inputs.length;

  return {
    records,
    rejected,
    duplicates,
    summary: {
      processed,
      normalized,
      accepted: records.length,
      rejected: rejected.length,
      duplicates: duplicates.length,
      successRate: processed === 0 ? 1 : normalized / processed,
    },
  };
}
