import { describe, expect, it } from 'vitest';
import { createCanonicalKey, normalizeScreening } from './normalizeScreening.js';

describe('createCanonicalKey', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(createCanonicalKey('  Cine   Ñuñoa  ')).toBe('cine-nunoa');
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
    });

    expect(screening.movieTitle).toBe('La Casa Lobo');
    expect(screening.movieKey).toBe('la-casa-lobo');
    expect(screening.sourceUrl).toBe('https://example.com/cartelera');
  });
});
