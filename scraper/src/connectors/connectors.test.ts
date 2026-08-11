import { describe, expect, it } from 'vitest';
import type { HttpClient, HttpResponse } from '../http/httpClient.js';
import { CinetecaConnector } from './cinetecaConnector.js';
import { CineUcConnector } from './cineUcConnector.js';
import { createDefaultConnectors } from './defaultConnectors.js';
import { DuocLumaConnector } from './duocLumaConnector.js';
import { EcopassCineCccConnector } from './ecopassCineCccConnector.js';
import { ElBiografoConnector } from './elBiografoConnector.js';
import { GoetheChileConnector } from './goetheChileConnector.js';
import { M100Connector } from './m100Connector.js';
import { NexoInstagramConnector } from './nexoInstagramConnector.js';
import { NormandieConnector } from './normandieConnector.js';
import { PasslineAlamedaConnector } from './passlineAlamedaConnector.js';
import { SalaKConnector } from './salaKConnector.js';
import { TicketplusNemesioConnector } from './ticketplusNemesioConnector.js';

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
    expect(
      records.every(
        (record) => ![1, 2].includes(new Date(`${record.screeningDate}T00:00:00Z`).getUTCDay()),
      ),
    ).toBe(true);
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
            {
              '@type': 'Event',
              name: 'FUNCIÓN DE CLAUSURA | Ciclo',
              startDate: '2026-08-12T20:00:00-04:00',
            },
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

  it('Passline sigue los eventos del recinto y conserva sólo fichas de películas', async () => {
    const listingUrl = 'https://www.passline.com/venue/centro-arte-alameda';
    const movieUrl = 'https://www.passline.com/eventos/la-invitacion';
    const concertUrl = 'https://www.passline.com/eventos/concierto';
    const connector = new PasslineAlamedaConnector(
      new FixtureHttpClient({
        [listingUrl]: `<a href="${movieUrl}">Película</a><a href="${concertUrl}">Concierto</a>`,
        [movieUrl]: `<main><h1>La Invitación / Centro Arte Alameda</h1>
          <p>Centro Arte Alameda / Sala CEINA</p><p>Seleccione el día:</p>
          <p>Domingo 02 Agosto 20:00 h.</p><p>Lunes 03 Agosto 14:45 h.</p>
          <p>Función Seleccionada</p><p>Sinopsis</p><p>Ficha técnica Dirección: Olivia Wilde</p></main>`,
        [concertUrl]: '<main><h1>Banda en vivo</h1><p>Miércoles 12 Agosto 20:00 hrs.</p></main>',
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({ movieTitle: 'La Invitación', screeningDate: '2026-08-02' }),
      expect.objectContaining({ movieTitle: 'La Invitación', screeningDate: '2026-08-03' }),
    ]);
  });

  it('Ticketplus interpreta horas sin minutos y con coma decimal', async () => {
    const listingUrl = 'https://ticketplus.cl/companies/Sala-nemesio';
    const detailUrl = 'https://ticketplus.cl/events/diamanti';
    const connector = new TicketplusNemesioConnector(
      new FixtureHttpClient({
        [listingUrl]: `<a href="/events/diamanti">Diamanti</a><a href="/events/membresia">Membresía</a>`,
        [detailUrl]: `<main><h1>Diamanti</h1><p>FUNCIONES</p>
          <p>Martes 11 de agosto 17hrs SUB</p><p>Miércoles 12 de agosto 19,30hrs SUB</p>
          <p>VER MÁS</p></main>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({ screeningDate: '2026-08-11', screeningTime: '17:00' }),
      expect.objectContaining({ screeningDate: '2026-08-12', screeningTime: '19:30' }),
    ]);
  });

  it('Ecopass lee la fuente JSON de Next.js y filtra Cine CCC', async () => {
    const url = 'https://www.ecopass.cl/producers/productor/2368';
    const connector = new EcopassCineCccConnector(
      new FixtureHttpClient({
        [url]: `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
          props: {
            pageProps: {
              producerData: { name: 'Centro Cultural de Cerrillos' },
              events: [
                {
                  id: 7,
                  name: 'Cine CCC: El lugar de la otra',
                  startDate: '2026-08-12T19:00:00-04:00',
                  addressObject: { description: 'Cine CCC' },
                },
                { id: 8, name: 'Taller de pintura', startDate: '2026-08-13T12:00:00-04:00' },
              ],
            },
          },
        })}</script>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'El lugar de la otra',
        venueName: 'Cine CCC',
        startsAt: '2026-08-12T19:00:00-04:00',
      }),
    ]);
  });

  it('Goethe excluye actividades online o fuera de Santiago', async () => {
    const url = 'https://www.goethe.de/ins/cl/es/ver.cfm';
    const connector = new GoetheChileConnector(
      new FixtureHttpClient({
        [url]: `<article class="teaser-card"><time datetime="2026-08-12">12.08.2026</time>
          <h3>Ciclo de cine</h3><p>19:00 | Cine: "Cleo" (2019)</p>
          <p>Goethe-Institut Chile, Santiago</p><a href="/evento/cleo">Detalle</a></article>
          <article class="teaser-card"><time datetime="2026-08-13">13.08.2026</time>
          <h3>Cine online</h3><p>19:00 En línea</p></article>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'Cleo',
        screeningDate: '2026-08-12',
        screeningTime: '19:00',
      }),
    ]);
  });

  it('Cine UC sigue el ciclo vigente y admite fechas que omiten el mes', async () => {
    const listingUrl = 'https://extension.uc.cl/cine-uc/cine-uc/';
    const detailUrl = 'https://extension.uc.cl/cartelera_cine/gigantes-del-japon/';
    const connector = new CineUcConnector(
      new FixtureHttpClient({
        [listingUrl]: `<h2>Cartelera de cine</h2><a href="${detailUrl}">Gigantes del Japón</a>`,
        [detailUrl]: `<main><p>3 de agosto 2026 al 21 de agosto 2026</p>
          <p>Lugar Sala de cine, Centro Extensión Alameda Entrada liberada</p>
          <h2>Programación</h2><h3>Godzilla, de Ishirō Honda (1954)</h3>
          <p>Lunes 10 16:00 hrs. y martes 11 agosto 18:30 hrs.</p></main>`,
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({ movieTitle: 'Godzilla', screeningDate: '2026-08-10' }),
      expect.objectContaining({ movieTitle: 'Godzilla', screeningDate: '2026-08-11' }),
    ]);
  });

  it('Duoc consume Luma y conserva sólo actividades cinematográficas', async () => {
    const apiUrl =
      'https://api.luma.com/calendar/get-items?calendar_api_id=cal-oHkme2Kdqru3GKs&period=future';
    const connector = new DuocLumaConnector(
      new FixtureHttpClient({
        [apiUrl]: JSON.stringify({
          entries: [
            {
              event: {
                api_id: 'evt-1',
                name: 'Ciclo de cine: Machuca | Duoc UC',
                start_at: '2026-08-12T23:00:00.000Z',
                timezone: 'America/Santiago',
                url: 'machuca',
                geo_address_info: {
                  localized: { es: { address: 'Antonio Varas 666', city: 'Santiago' } },
                },
              },
            },
            { event: { name: 'Taller de cine', start_at: '2026-08-13T15:00:00.000Z' } },
          ],
        }),
      }),
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'Machuca',
        venueName: 'Antonio Varas 666, Santiago',
        startsAt: '2026-08-12T23:00:00.000Z',
      }),
    ]);
  });

  it('Nexo usa captions de la API de Instagram sin exponer el token en la URL', async () => {
    const apiUrl =
      'https://graph.instagram.com/me/media?fields=id,caption,permalink,timestamp&limit=25';
    const connector = new NexoInstagramConnector(
      new FixtureHttpClient({
        [apiUrl]: JSON.stringify({
          data: [
            {
              id: 'post-1',
              caption:
                'Película: "La memoria infinita"\nMiércoles 12 de agosto de 2026 19:00 hrs\nSala Nexo Cinema',
              permalink: 'https://www.instagram.com/p/abc/',
              timestamp: '2026-08-01T12:00:00Z',
            },
          ],
        }),
      }),
      'secret-token',
      fixedNow,
    );
    await expect(connector.collect()).resolves.toEqual([
      expect.objectContaining({
        movieTitle: 'La memoria infinita',
        screeningDate: '2026-08-12',
        screeningTime: '19:00',
        sourceType: 'social_media',
      }),
    ]);
  });

  it('registra once fuentes sin credenciales y las doce al configurar Instagram', () => {
    const http = new FixtureHttpClient({});
    expect(createDefaultConnectors(http)).toHaveLength(11);
    expect(
      createDefaultConnectors(http, { nexoInstagramAccessToken: 'secret-token' }),
    ).toHaveLength(12);
  });
});
