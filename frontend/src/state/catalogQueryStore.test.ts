import { describe, expect, it } from 'vitest';
import { parseCatalogQuery, writeCatalogQuery } from './catalogQueryStore';

describe('catalogQueryStore', () => {
  it('interpreta la URL pública y descarta paginación u orden inválidos', () => {
    expect(
      parseCatalogQuery(
        new URLSearchParams(
          'buscar=El+viento&fecha=2026-09-18&horario=20%3A30&sala=sala-k&genero=drama&orden=destacados&pagina=3',
        ),
      ),
    ).toEqual({
      search: 'El viento',
      date: '2026-09-18',
      time: '20:30',
      venue: 'sala-k',
      genre: 'drama',
      sort: 'featured',
      page: 3,
      pageSize: 30,
    });

    expect(parseCatalogQuery(new URLSearchParams('orden=desconocido&pagina=-4'))).toEqual({
      search: undefined,
      date: undefined,
      time: undefined,
      venue: undefined,
      genre: undefined,
      sort: undefined,
      page: 1,
      pageSize: 30,
    });
  });

  it('genera una URL canónica sin perder parámetros ajenos a los filtros', () => {
    const parameters = writeCatalogQuery(new URLSearchParams('utm_source=boletin&pagina=99'), {
      page: 2,
      pageSize: 30,
      search: 'cine chileno',
      venue: 'sala-k',
      sort: 'alphabetical-desc',
    });

    expect(Object.fromEntries(parameters)).toEqual({
      utm_source: 'boletin',
      buscar: 'cine chileno',
      sala: 'sala-k',
      orden: 'alfabetico_desc',
      pagina: '2',
    });
  });
});
