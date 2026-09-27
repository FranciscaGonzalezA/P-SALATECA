import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoMovies, filterDemoMovies } from './demoCatalog';

describe('filterDemoMovies', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('combina fecha, hora, sala y género sin dejar funciones incompatibles', () => {
    const result = filterDemoMovies({
      date: '2026-08-01',
      time: '19:30',
      venue: 'cine-arte-normandie',
      genre: 'documental',
      page: 1,
      pageSize: 6,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.title).toBe('El agente topo');
    expect(result.items[0]?.screenings).toHaveLength(1);
  });

  it('busca sin distinguir mayúsculas en título o dirección', () => {
    expect(
      filterDemoMovies({ search: 'PATRICIO', page: 1, pageSize: 10 }).items.map(
        (movie) => movie.title,
      ),
    ).toEqual(['Nostalgia de la luz', 'El botón de nácar']);
  });

  it('pagina sin mutar el catálogo fuente', () => {
    const originalScreeningCount = demoMovies[0]?.screenings.length;
    const result = filterDemoMovies({ page: 2, pageSize: 2 });

    expect(result.total).toBe(demoMovies.length);
    expect(result.items).toHaveLength(2);
    expect(demoMovies[0]?.screenings).toHaveLength(originalScreeningCount);
  });

  it('ordena por próximas funciones, destacadas o título', () => {
    const upcoming = filterDemoMovies({ sort: 'upcoming', page: 1, pageSize: 10 }).items;
    const featured = filterDemoMovies({ sort: 'featured', page: 1, pageSize: 10 }).items;
    const alphabeticalAsc = filterDemoMovies({
      sort: 'alphabetical-asc',
      page: 1,
      pageSize: 10,
    }).items;
    const alphabeticalDesc = filterDemoMovies({
      sort: 'alphabetical-desc',
      page: 1,
      pageSize: 10,
    }).items;

    expect(upcoming.map((movie) => movie.screenings[0]?.startsAt)).toEqual(
      [...upcoming]
        .map((movie) => movie.screenings[0]?.startsAt)
        .sort((left, right) => (left ?? '').localeCompare(right ?? '')),
    );
    expect(featured[0]?.title).toBe('La casa lobo');
    expect(alphabeticalAsc.map((movie) => movie.title)).toEqual(
      [...alphabeticalAsc]
        .map((movie) => movie.title)
        .sort((left, right) => left.localeCompare(right, 'es-CL', { sensitivity: 'base' })),
    );
    expect(alphabeticalDesc.map((movie) => movie.title)).toEqual(
      [...alphabeticalAsc].map((movie) => movie.title).reverse(),
    );
  });

  it('devuelve una colección vacía para filtros sin coincidencias', () => {
    expect(filterDemoMovies({ venue: 'sala-inexistente', page: 1, pageSize: 6 })).toEqual({
      items: [],
      total: 0,
    });
  });

  it('omite funciones anteriores al día en que se consulta la cartelera', () => {
    vi.setSystemTime(new Date(2026, 7, 3, 12));

    const result = filterDemoMovies({ page: 1, pageSize: 10 });

    expect(
      result.items.flatMap((movie) => movie.screenings).every((item) => item.date >= '2026-08-03'),
    ).toBe(true);
  });
});
