import { cleanText } from './text.js';

const monthNumbers: Readonly<Record<string, number>> = {
  ene: 1,
  enero: 1,
  feb: 2,
  febrero: 2,
  mar: 3,
  marzo: 3,
  abr: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  jul: 7,
  julio: 7,
  ago: 8,
  agosto: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  set: 9,
  setiembre: 9,
  oct: 10,
  octubre: 10,
  nov: 11,
  noviembre: 11,
  dic: 12,
  diciembre: 12,
};

const weekdayNumbers: Readonly<Record<string, number>> = {
  domingo: 0,
  dom: 0,
  lunes: 1,
  lun: 1,
  martes: 2,
  mar: 2,
  miercoles: 3,
  mie: 3,
  jueves: 4,
  jue: 4,
  viernes: 5,
  vie: 5,
  sabado: 6,
  sab: 6,
};

export interface DateRange {
  start: Date;
  end: Date;
}

function canonicalWord(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .toLocaleLowerCase('es-CL');
}

export function monthNumber(value: string): number | undefined {
  return monthNumbers[canonicalWord(value)];
}

function validUtcDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : undefined;
}

export function inferYear(month: number, day: number, reference: Date): number {
  const candidates = [reference.getUTCFullYear() - 1, reference.getUTCFullYear(), reference.getUTCFullYear() + 1]
    .map((year) => ({ date: validUtcDate(year, month, day), year }))
    .filter((candidate): candidate is { date: Date; year: number } => Boolean(candidate.date));
  candidates.sort(
    (left, right) =>
      Math.abs(left.date.getTime() - reference.getTime()) -
      Math.abs(right.date.getTime() - reference.getTime()),
  );
  return candidates[0]?.year ?? reference.getUTCFullYear();
}

export function parseNamedMonthRange(text: string, reference: Date): DateRange | undefined {
  const match = /(\d{1,2})\s*(?:[–—-]\s*)?al\s+(\d{1,2})\s+de\s+([\p{Letter}.]+)(?:\s*[·.-]?\s*(\d{4}))?/iu.exec(
    cleanText(text),
  );
  if (!match?.[1] || !match[2] || !match[3]) return undefined;
  const month = monthNumber(match[3]);
  if (!month) return undefined;
  const startDay = Number(match[1]);
  const endDay = Number(match[2]);
  const year = Number(match[4] ?? inferYear(month, startDay, reference));
  const start = validUtcDate(year, month, startDay);
  const end = validUtcDate(year, month, endDay);
  return start && end && start <= end ? { start, end } : undefined;
}

export function parseNumericDateRange(text: string, reference: Date): DateRange | undefined {
  const match = /(?:del\s+)?(\d{1,2})(?:\/(\d{1,2}))?\s+al\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i.exec(
    cleanText(text),
  );
  if (!match?.[1] || !match[3] || !match[4]) return undefined;
  const startDay = Number(match[1]);
  const endDay = Number(match[3]);
  const endMonth = Number(match[4]);
  const startMonth = Number(match[2] ?? endMonth);
  const endYear = Number(match[5] ?? inferYear(endMonth, endDay, reference));
  let startYear = endYear;
  if (startMonth > endMonth) startYear -= 1;
  const start = validUtcDate(startYear, startMonth, startDay);
  const end = validUtcDate(endYear, endMonth, endDay);
  if (!start || !end || start > end) return undefined;
  return { start, end };
}

export function eachDay(range: DateRange, allowedWeekdays?: ReadonlySet<number>): Date[] {
  const dates: Date[] = [];
  for (let cursor = range.start; cursor <= range.end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    if (!allowedWeekdays || allowedWeekdays.has(cursor.getUTCDay())) dates.push(cursor);
  }
  return dates;
}

export function parseWeekdayRange(text: string): ReadonlySet<number> | undefined {
  const match = /\b(lun(?:es)?|mar(?:tes)?|mi[eé](?:rcoles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?)(?:\s+a\s+(lun(?:es)?|mar(?:tes)?|mi[eé](?:rcoles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?))?\b/i.exec(
    cleanText(text),
  );
  if (!match?.[1]) return undefined;
  const start = weekdayNumbers[canonicalWord(match[1])];
  const end = weekdayNumbers[canonicalWord(match[2] ?? match[1])];
  if (start === undefined || end === undefined) return undefined;
  const days = new Set<number>();
  let current = start;
  for (let count = 0; count < 7; count += 1) {
    days.add(current);
    if (current === end) return days;
    current = (current + 1) % 7;
  }
  return undefined;
}

export function parseTime(text: string): string | undefined {
  const match = /\b(\d{1,2})[:.](\d{2})\b/.exec(text);
  if (!match?.[1] || !match[2]) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59
    ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    : undefined;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function extractNamedDateTimes(text: string, reference: Date): Array<{ date: string; time: string }> {
  const cleaned = cleanText(text);
  const pattern = /(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)?\s*(\d{1,2})\s*(?:de\s+)?([\p{Letter}.]+)(?:\s+(?:de\s+)?(\d{4}))?/giu;
  const matches = [...cleaned.matchAll(pattern)].filter((match) => Boolean(match[2] && monthNumber(match[2])));
  const values: Array<{ date: string; time: string }> = [];
  for (const [index, match] of matches.entries()) {
    if (!match[1] || !match[2] || match.index === undefined) continue;
    const month = monthNumber(match[2]);
    if (!month) continue;
    const day = Number(match[1]);
    const year = Number(match[3] ?? inferYear(month, day, reference));
    const date = validUtcDate(year, month, day);
    if (!date) continue;
    const end = matches[index + 1]?.index ?? cleaned.length;
    const fragment = cleaned.slice(match.index + match[0].length, end);
    for (const timeMatch of fragment.matchAll(/\b(\d{1,2})[:.](\d{2})\b/g)) {
      const time = parseTime(timeMatch[0]);
      if (time) values.push({ date: isoDate(date), time });
    }
  }
  return values;
}
