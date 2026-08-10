import { describe, expect, it } from 'vitest';
import type { HttpClient, HttpResponse } from '../http/httpClient.js';
import { CinetecaConnector } from './cinetecaConnector.js';
import { ElBiografoConnector } from './elBiografoConnector.js';
import { M100Connector } from './m100Connector.js';
import { NormandieConnector } from './normandieConnector.js';
import { SalaKConnector } from './salaKConnector.js';

const fixedNow = () => new Date('2026-08-10T12:00:00.000Z');

class FixtureHttpClient implements HttpClient {
  constructor(private readonly responses: Readonly<Record<string, string>>) {}

  async get(url: URL): Promise<HttpResponse> {
    const body = this.responses[url.href];
    if (body === undefined) throw new Error(`Fixture ausente: ${url.href}`);
    return { body, status: 200, url };
  }
}

describe('conectores de cartelera', () => {
  it('extrae Normandie usando el rango semanal y el enlace oficial', async () => {
    const url = 'https://normandie.cl/cartelera/';
    const connector = new NormandieConnector(
      new FixtureHttpClient({
        [url]: `
          <div class="contenedorcartelera">
            <div class="titulocartelera">Semana desde el jueves 6 al miércoles 12 de agosto</div>
            <section><h5>Miércoles 12</h5><div>19:00 hrs.</div>
              <a href="https://www.flow.cl/evento/film">La casa lobo</a>
            </section>
          </div>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'La casa lobo',
        screeningDate: '2026-08-12',
        screeningTime: '19:00',
        sourceUrl: 'https://www.flow.cl/evento/film',
      }),
    ]);
  });

  it('acepta el mes abreviado que usa El Biógrafo y expande la semana', async () => {
    const url = 'https://elbiografo.cl/#cartelera';
    const connector = new ElBiografoConnector(
      new FixtureHttpClient({
        [url]: `<section><p>06 – al 12 de Ago · 2026</p><div class="movies-grid">
          <div class="movie-card"><span class="movie-time">▶ 18:00 hrs</span><h3 class="movie-title">Diamanti</h3></div>
        </div></section>`,
      }),
      fixedNow,
    );
    const records = await connector.collect();
    expect(records).toHaveLength(7);
    expect(records[0]).toMatchObject({ screeningDate: '2026-08-06', screeningTime: '18:00' });
    expect(records.at(-1)).toMatchObject({ screeningDate: '2026-08-12' });
  });

  it('M100 sólo crea funciones en los días publicados', async () => {
    const listingUrl = 'https://www.m100.cl/programacion/cine/';
    const detailUrl = 'https://www.m100.cl/programacion/cine/pelicula/';
    const connector = new M100Connector(
      new FixtureHttpClient({
        [listingUrl]: `<article class="post-card"><a href="${detailUrl}">Película</a></article>`,
        [detailUrl]: `<main><h1>La naturaleza de las cosas invisibles</h1>
          <p>Del 06 al 30/08/2026</p><p>Mié a dom – 20:00 hrs</p></main>`,
      }),
      fixedNow,
    );
    const records = await connector.collect();
    expect(records).toHaveLength(19);
    expect(records.every((record) => ![1, 2].includes(new Date(`${record.screeningDate}T00:00:00Z`).getUTCDay()))).toBe(true);
  });

  it('Sala K conserva resultados aunque cada detalle se consulte por separado', async () => {
    const listingUrl = 'https://salak.cl/cartelera/';
    const detailUrl = 'https://salak.cl/pelicula/';
    const connector = new SalaKConnector(
      new FixtureHttpClient({
        [listingUrl]: `<div class="et_pb_portfolio_item"><h2>La Once</h2><a href="${detailUrl}">Detalle</a></div>`,
        [detailUrl]: `<main><h1>Cine inclusivo: La Once</h1><p>FUNCIONES</p>
          <p>Miércoles 12 de agosto de 2026 19:30 hrs</p><p>Casa de la Cultura - Maipú</p><p>TARIFAS</p></main>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'La Once',
        venueName: 'Casa de la Cultura - Maipú',
        screeningDate: '2026-08-12',
        screeningTime: '19:30',
      }),
    ]);
  });

  it('Cineteca preserva el offset y excluye actividades que no son películas', async () => {
    const url = 'https://cinetecanacional.gob.cl/cartelera/';
    const connector = new CinetecaConnector(
      new FixtureHttpClient({
        [url]: `<script type="application/ld+json">${JSON.stringify({
          '@graph': [
            {
              '@type': 'Event',
              name: 'Tres tristes tigres',
              startDate: '2026-08-12T19:00:00-04:00',
              url: 'https://cinetecanacional.gob.cl/evento/tres-tristes-tigres',
              location: { name: 'Sala de cine' },
            },
            { '@type': 'Event', name: 'Paneles temáticos', startDate: '2026-08-12T12:00:00-04:00' },
          ],
        })}</script>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'Tres tristes tigres',
        startsAt: '2026-08-12T19:00:00-04:00',
        venueName: 'Sala de cine',
      }),
    ]);
  });
});
