import { describe, expect, it } from 'vitest';
import { demoMovies, filterDemoMovies } from './demoCatalog';

describe('filterDemoMovies', () => {
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

  it('devuelve una colección vacía para filtros sin coincidencias', () => {
    expect(filterDemoMovies({ venue: 'sala-inexistente', page: 1, pageSize: 6 })).toEqual({
      items: [],
      total: 0,
    });
  });
});
