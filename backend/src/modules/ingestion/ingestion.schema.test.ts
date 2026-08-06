import { describe, expect, it } from 'vitest';
import { parseNormalizedScreening } from './ingestion.schema.js';

const validScreening = {
  movieTitle: 'La casa lobo',
  venueName: 'Cineteca Nacional',
  movieKey: 'la-casa-lobo',
  venueKey: 'cineteca-nacional',
  screeningDate: '2026-08-01',
  screeningTime: '20:00',
  startsAt: '2026-08-02T00:00:00.000Z',
  sourceTimezone: 'America/Santiago',
  sourceUrl: 'https://example.com/cartelera',
  sourceType: 'website',
  capturedAt: '2026-07-27T12:00:00.000Z',
  duplicateKey: 'la-casa-lobo:cineteca-nacional:2026-08-02T00:00:00.000Z',
};

describe('parseNormalizedScreening', () => {
  it('acepta el contrato normalizado completo', () => {
    expect(
      parseNormalizedScreening({
        ...validScreening,
        sourceRecordKey: 'source-1',
        language: 'Español',
        format: '2D',
      }),
    ).toEqual({
      success: true,
      data: {
        ...validScreening,
        sourceRecordKey: 'source-1',
        language: 'Español',
        format: '2D',
      },
    });
  });

  it('entrega errores trazables por campo', () => {
    const result = parseNormalizedScreening({
      ...validScreening,
      movieKey: 'Clave Inválida',
      sourceUrl: 'sin-url',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Se esperaban errores de validación.');
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'movieKey', code: 'invalid_format' }),
        expect.objectContaining({ field: 'sourceUrl' }),
      ]),
    );
  });

  it('identifica como record una entrada que no es objeto', () => {
    const result = parseNormalizedScreening(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.field).toBe('record');
    }
  });
});
