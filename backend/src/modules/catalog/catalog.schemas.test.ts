import { describe, expect, it } from 'vitest';
import { catalogFiltersSchema, movieIdSchema } from './catalog.schemas.js';

describe('catalogFiltersSchema', () => {
  it('acepta el orden especial para destacados', () => {
    expect(catalogFiltersSchema.parse({ orden: 'destacados' })).toMatchObject({
      orden: 'destacados',
      pagina: 1,
      limite: 12,
    });
  });

  it('aplica paginación segura y acepta filtros combinados', () => {
    const result = catalogFiltersSchema.parse({
      fecha: '2026-08-01',
      horario: '20:00',
      sala: 'cine-arte-normandie',
      genero: 'drama',
      pagina: '2',
      limite: '6',
    });

    expect(result).toEqual({
      fecha: '2026-08-01',
      horario: '20:00',
      sala: 'cine-arte-normandie',
      genero: 'drama',
      pagina: 2,
      limite: 6,
    });
  });

  it('rechaza límites excesivos y fechas ambiguas', () => {
    expect(catalogFiltersSchema.safeParse({ fecha: '01/08/2026', limite: 100 }).success).toBe(
      false,
    );
  });

  it('rechaza fechas inexistentes y horarios fuera de rango', () => {
    expect(catalogFiltersSchema.safeParse({ fecha: '2026-02-30' }).success).toBe(false);
    expect(catalogFiltersSchema.safeParse({ horario: '24:00' }).success).toBe(false);
    expect(catalogFiltersSchema.safeParse({ horario: '23:60' }).success).toBe(false);
  });

  it('convierte filtros vacíos en valores ausentes', () => {
    expect(
      catalogFiltersSchema.parse({
        fecha: '',
        horario: '',
        sala: '',
        genero: '',
        buscar: '',
      }),
    ).toEqual({ pagina: 1, limite: 12 });
  });
});

describe('movieIdSchema', () => {
  it('acepta únicamente identificadores positivos', () => {
    expect(movieIdSchema.parse('42')).toBe(42);
    expect(movieIdSchema.safeParse('0').success).toBe(false);
    expect(movieIdSchema.safeParse('1.5').success).toBe(false);
  });
});
