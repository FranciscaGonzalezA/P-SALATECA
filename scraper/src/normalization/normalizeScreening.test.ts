import { describe, expect, it } from 'vitest';
import {
  createCanonicalKey,
  normalizeDate,
  normalizeScreening,
  normalizeScreenings,
  normalizeTime,
  normalizeWhitespace,
  safeNormalizeScreening,
  ScreeningNormalizationError,
} from './normalizeScreening.js';

const fixedNow = () => new Date('2026-07-27T12:00:00.000Z');

describe('createCanonicalKey', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(createCanonicalKey('  Cine   Ñuñoa  ')).toBe('cine-nunoa');
  });

  it('elimina caracteres invisibles y puntuación sobrante', () => {
    expect(normalizeWhitespace('  Cine\u200B  arte  ,  hoy  ')).toBe('Cine arte, hoy');
    expect(createCanonicalKey('¿Cine & Arte?')).toBe('cine-arte');
  });
});

describe('normalización de fecha y horario', () => {
  it('convierte formatos locales a YYYY-MM-DD y HH:MM', () => {
    expect(normalizeDate('1/08/2026')).toBe('2026-08-01');
    expect(normalizeTime('8:05 pm')).toBe('20:05');
    expect(normalizeTime('12:00 am')).toBe('00:00');
    expect(normalizeTime('12:00 pm')).toBe('12:00');
  });

  it.each(['2026-02-30', '31/04/2026', '2026.08.01'])('rechaza la fecha inválida %s', (date) => {
    expect(() => normalizeDate(date)).toThrow(ScreeningNormalizationError);
  });

  it.each(['24:00', '12:60', '0:30 pm', '8 pm'])('rechaza el horario inválido %s', (time) => {
    expect(() => normalizeTime(time)).toThrow(ScreeningNormalizationError);
  });
});

describe('normalizeScreening', () => {
  it('mantiene trazabilidad y genera claves comparables', () => {
    const screening = normalizeScreening({
      movieTitle: '  La   Casa Lobo ',
      venueName: 'Cineteca Nacional',
      startsAt: '2026-08-01T20:00:00-04:00',
      sourceUrl: 'https://example.com/cartelera',
      sourceType: 'website',
      capturedAt: '2026-07-26T18:30:00-04:00',
    });

    expect(screening.movieTitle).toBe('La Casa Lobo');
    expect(screening.movieKey).toBe('la-casa-lobo');
    expect(screening.sourceUrl).toBe('https://example.com/cartelera');
    expect(screening.screeningDate).toBe('2026-08-01');
    expect(screening.screeningTime).toBe('20:00');
    expect(screening.startsAt).toBe('2026-08-02T00:00:00.000Z');
    expect(screening.capturedAt).toBe('2026-07-26T22:30:00.000Z');
  });

  it('combina fecha y horario locales respetando America/Santiago', () => {
    const screening = normalizeScreening(
      {
        movieTitle: 'El agente topo',
        venueName: 'Cine Arte Normandie',
        screeningDate: '01/08/2026',
        screeningTime: '19.30',
        sourceUrl: 'https://example.com/normandie',
        sourceType: 'website',
      },
      { now: fixedNow },
    );

    expect(screening.screeningDate).toBe('2026-08-01');
    expect(screening.screeningTime).toBe('19:30');
    expect(screening.startsAt).toBe('2026-08-01T23:30:00.000Z');
    expect(screening.capturedAt).toBe('2026-07-27T12:00:00.000Z');
  });

  it('normaliza alias de sala sin perder el nombre de presentación', () => {
    const screening = normalizeScreening(
      {
        movieTitle: 'Nostalgia de la luz',
        venueName: 'Cineteca nac. de Chile',
        screeningDate: '2026-08-02',
        screeningTime: '17:00',
        sourceUrl: 'https://example.com/cineteca',
        sourceType: 'manual',
      },
      {
        now: fixedNow,
        venueAliases: {
          'Cineteca nac. de Chile': 'Cineteca Nacional de Chile',
        },
      },
    );

    expect(screening.venueName).toBe('Cineteca Nacional de Chile');
    expect(screening.venueKey).toBe('cineteca-nacional-de-chile');
  });

  it('aplica una zona horaria predeterminada configurable', () => {
    const screening = normalizeScreening(
      {
        movieTitle: 'Película',
        venueName: 'Sala',
        startsAt: '2026-08-01 20:00',
        sourceUrl: 'https://example.com',
        sourceType: 'api',
      },
      { defaultTimezone: 'UTC', now: fixedNow },
    );

    expect(screening.startsAt).toBe('2026-08-01T20:00:00.000Z');
    expect(screening.sourceTimezone).toBe('UTC');
  });

  it('rechaza zonas horarias y fechas con offset inválidas', () => {
    const base = {
      movieTitle: 'Película',
      venueName: 'Sala',
      sourceUrl: 'https://example.com',
      sourceType: 'website' as const,
    };

    expect(() =>
      normalizeScreening(
        { ...base, screeningDate: '2026-08-01', screeningTime: '20:00' },
        { defaultTimezone: 'Zona/Inexistente' },
      ),
    ).toThrow(ScreeningNormalizationError);
    expect(() => normalizeScreening({ ...base, startsAt: '2026-02-30T20:00:00-03:00' })).toThrow(
      ScreeningNormalizationError,
    );
  });

  it('rechaza combinaciones parciales o timestamps sin zona', () => {
    const base = {
      movieTitle: 'Película',
      venueName: 'Sala',
      sourceUrl: 'https://example.com',
      sourceType: 'manual' as const,
    };

    expect(() => normalizeScreening({ ...base, screeningDate: '2026-08-01' })).toThrow(
      ScreeningNormalizationError,
    );
    expect(() => normalizeScreening({ ...base, startsAt: '01/08/2026 20:00' })).toThrow(
      ScreeningNormalizationError,
    );
  });
});

describe('safeNormalizeScreening', () => {
  it('conserva el registro rechazado y explica el campo inválido', () => {
    const result = safeNormalizeScreening(
      {
        movieTitle: 'Película sin fecha válida',
        venueName: 'Sala de prueba',
        screeningDate: '31/02/2026',
        screeningTime: '20:00',
        sourceUrl: 'https://example.com/error',
        sourceType: 'manual',
      },
      { now: fixedNow },
    );

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Se esperaba un registro rechazado.');
    }

    expect(result.rejection.capturedAt).toBe('2026-07-27T12:00:00.000Z');
    expect(result.rejection.issues).toContainEqual(
      expect.objectContaining({ field: 'screeningDate', code: 'invalid_date' }),
    );
  });
});

describe('normalizeScreenings', () => {
  it('no publica duplicados y mantiene una tasa verificable de normalización del 90 %', () => {
    const baseRecords = [
      ['La casa lobo', 'Cineteca Nacional', '01/08/2026', '18:00'],
      ['El agente topo', 'Cine Arte Normandie', '01/08/2026', '19:30'],
      ['Nostalgia de la luz', 'Sala K', '02/08/2026', '17:00'],
      ['Machuca', 'Centro Arte Alameda', '02/08/2026', '20:00'],
      ['Una mujer fantástica', 'Cine UC', '03/08/2026', '18:30'],
      ['El botón de nácar', 'Cineteca Nacional', '03/08/2026', '20:15'],
      ['1976', 'Sala K', '04/08/2026', '19:00'],
      ['Los colonos', 'Centro Arte Alameda', '04/08/2026', '21:00'],
    ].map(([movieTitle, venueName, screeningDate, screeningTime], index) => ({
      movieTitle,
      venueName,
      screeningDate,
      screeningTime,
      sourceUrl: `https://example.com/fuente/${index}`,
      sourceType: 'website' as const,
    }));

    const duplicate = {
      ...baseRecords[0],
      sourceUrl: 'https://example.com/fuente/duplicada',
    };
    const invalid = {
      movieTitle: 'Registro incompleto',
      venueName: '',
      screeningDate: '05/08/2026',
      screeningTime: '20:00',
      sourceUrl: 'https://example.com/fuente/error',
      sourceType: 'manual' as const,
    };

    const result = normalizeScreenings([...baseRecords, duplicate, invalid], { now: fixedNow });

    expect(result.summary).toEqual({
      processed: 10,
      normalized: 9,
      accepted: 8,
      rejected: 1,
      duplicates: 1,
      successRate: 0.9,
    });
    expect(result.records).toHaveLength(8);
    expect(result.duplicates).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
  });

  it('define un lote vacío como completamente normalizable', () => {
    expect(normalizeScreenings([]).summary).toEqual({
      processed: 0,
      normalized: 0,
      accepted: 0,
      rejected: 0,
      duplicates: 0,
      successRate: 1,
    });
  });
});
