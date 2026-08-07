import { describe, expect, it } from 'vitest';
import { classifyScreeningTitle } from './movieTitleClassifier.js';

describe('classifyScreeningTitle', () => {
  it.each([
    'Sin función',
    'Función sorpresa',
    'Paneles temáticos',
    'Charla inaugural | Jornadas sobre cine',
    'Experiencia VR — Cine UDD',
    'Premiación Noche de Monos 2026',
    'Visionado cortometrajes nominados',
    'Butterfly + The Crossing',
  ])('clasifica como actividad: %s', (title) => {
    expect(classifyScreeningTitle(title).kind).toBe('activity');
  });

  it.each([
    ['Yo y la que fui + cineforo', 'Yo y la que fui'],
    ['Cine inclusivo: La Once', 'La Once'],
    ['Imprescindibles: Pesadillas en los 80′ // Robocop', 'Robocop'],
    ['Chao: La Sirena [doblada al español]', 'Chao: La Sirena'],
    ['El exorcista (corte del director)', 'El exorcista'],
  ])('extrae la película de %s', (source, expected) => {
    expect(classifyScreeningTitle(source)).toEqual({ kind: 'movie', title: expected });
  });

  it('no confunde títulos legítimos con actividades', () => {
    expect(classifyScreeningTitle('La función de la noche')).toEqual({
      kind: 'movie',
      title: 'La función de la noche',
    });
  });
});
