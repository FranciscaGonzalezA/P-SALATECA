import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { extractNamedDateTimes } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

function betweenMarkers(text: string, startMarker: string, endMarkers: readonly string[]): string {
  const normalized = text.toLocaleLowerCase('es-CL');
  const start = normalized.indexOf(startMarker.toLocaleLowerCase('es-CL'));
  if (start < 0) return text;
  const contentStart = start + startMarker.length;
  const ends = endMarkers
    .map((marker) => normalized.indexOf(marker.toLocaleLowerCase('es-CL'), contentStart))
    .filter((index) => index >= 0);
  return cleanText(text.slice(contentStart, ends.length ? Math.min(...ends) : text.length));
}

function venueFromText(text: string): string {
  const venues = [
    'Campus El Claustro, U. Mayor',
    'U. MAYOR CAMPUS EL CLAUSTRO',
    'Auditorio Municipal de Maipú',
    'Casa de la Cultura - Maipú',
    'Casa de la Cultura',
  ];
  const match = venues.find((venue) => text.toLocaleLowerCase('es-CL').includes(venue.toLocaleLowerCase('es-CL')));
  return match === 'U. MAYOR CAMPUS EL CLAUSTRO' ? 'Campus El Claustro, U. Mayor' : (match ?? 'Sala K');
}

export class SalaKConnector implements SourceConnector {
  readonly id = 'sala_k';
  readonly name = 'Sala K';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://salak.cl/cartelera/');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const listing = await this.http.get(this.sourceUrl);
    const $ = load(listing.body);
    const links = new Map<string, string>();
    for (const item of $('.et_pb_portfolio_item').toArray()) {
      const href = $(item).find('a[href]').first().attr('href');
      if (!href) continue;
      links.set(new URL(href, listing.url).href, cleanText($(item).find('h2').first().text()));
    }

    const screenings: RawScreening[] = [];
    for (const [href, fallbackTitle] of links) {
      try {
        const detail = await this.http.get(new URL(href));
        screenings.push(...this.parseDetail(detail.body, detail.url, fallbackTitle));
      } catch (error) {
        console.warn(`[scraper:${this.id}] detalle omitido ${href}:`, error);
      }
    }
    return screenings;
  }

  private parseDetail(html: string, sourceUrl: URL, fallbackTitle: string): RawScreening[] {
    const $ = load(html);
    const spacedBody = $('body').clone();
    spacedBody.find('*').append(' ');
    const text = cleanText(spacedBody.text());
    if (/suspendid[ao]/i.test(text)) return [];
    const movieTitle = cleanMovieTitle($('h1').first().text() || fallbackTitle);
    if (!movieTitle || isNonMovieActivity(movieTitle)) return [];
    const dateText = betweenMarkers(text, 'FUNCIONES', ['COMPRA', 'TARIFAS']);
    const capturedAt = this.now();
    return extractNamedDateTimes(dateText, capturedAt).map(({ date, time }) => ({
      movieTitle,
      venueName: venueFromText(dateText),
      screeningDate: date,
      screeningTime: time,
      sourceTimezone: 'America/Santiago',
      sourceUrl: sourceUrl.href,
      sourceType: this.type,
      sourceRecordKey: `${sourceUrl.href}#${date}T${time}`,
      capturedAt: capturedAt.toISOString(),
    }));
  }
}
