import { describe, expect, it } from 'vitest';
import {
  eachDay,
  parseNamedMonthRange,
  parseNumericDateRange,
  parseWeekdayRange,
} from './dates.js';

describe('parsing de fechas de fuentes', () => {
  it('reconoce abreviaturas españolas', () => {
    const range = parseNamedMonthRange(
      '06 – al 12 de Ago · 2026',
      new Date('2026-08-10T00:00:00Z'),
    );
    expect(range?.start.toISOString()).toBe('2026-08-06T00:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2026-08-12T00:00:00.000Z');
  });

  it('infiere correctamente un rango que cruza de año', () => {
    const range = parseNumericDateRange('Del 29/12 al 03/01', new Date('2026-12-30T00:00:00Z'));
    expect(range?.start.toISOString()).toBe('2026-12-29T00:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2027-01-03T00:00:00.000Z');
  });

  it('expande únicamente miércoles a domingo', () => {
    const weekdays = parseWeekdayRange('Mié a dom – 20:00 hrs');
    const range = parseNumericDateRange('Del 06 al 12/08/2026', new Date('2026-08-10T00:00:00Z'));
    expect(
      range && weekdays ? eachDay(range, weekdays).map((date) => date.getUTCDay()) : [],
    ).toEqual([4, 5, 6, 0, 3]);
  });
});
