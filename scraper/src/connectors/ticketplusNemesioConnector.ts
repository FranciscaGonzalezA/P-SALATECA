import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { extractSpanishDateTimes } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

function bodyText(html: string): string {
  const $ = load(html);
  const body = $('body').clone();
  body.find('*').append(' ');
  return cleanText(body.text());
}

function between(text: string, startMarker: string, endMarker: string): string {
  const start = text.toLocaleLowerCase('es-CL').indexOf(startMarker.toLocaleLowerCase('es-CL'));
  if (start < 0) return '';
  const contentStart = start + startMarker.length;
  const end = text
    .toLocaleLowerCase('es-CL')
    .indexOf(endMarker.toLocaleLowerCase('es-CL'), contentStart);
  return text.slice(contentStart, end < 0 ? text.length : end);
}

export class TicketplusNemesioConnector implements SourceConnector {
  readonly id = 'ticketplus_nemesio';
  readonly name = 'Sala Nemesio - Ticketplus';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://ticketplus.cl/companies/Sala-nemesio');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const listing = await this.http.get(this.sourceUrl);
    const $ = load(listing.body);
    const links = new Set<string>();
    for (const element of $('a[href]').toArray()) {
      const href = $(element).attr('href');
      if (!href || !/^\/events\//i.test(href) || /membres[iÃ­]a/i.test(href)) continue;
      links.add(new URL(href, listing.url).href);
    }

    const records: RawScreening[] = [];
    for (const href of links) {
      try {
        const detail = await this.http.get(new URL(href));
        records.push(...this.parseDetail(detail.body, detail.url));
      } catch (error) {
        console.warn(`[scraper:${this.id}] detalle omitido ${href}:`, error);
      }
    }
    return records;
  }

  private parseDetail(html: string, sourceUrl: URL): RawScreening[] {
    const $ = load(html);
    const text = bodyText(html);
    const movieTitle = cleanMovieTitle(
      ($('h1').first().text() || $('title').first().text()).replace(
        /^(?:Tus\s+)?entradas\s+para\s+/i,
        '',
      ),
    );
    if (!movieTitle || isNonMovieActivity(movieTitle)) return [];
    const functions = between(text, 'FUNCIONES', 'VER MÃS');
    const capturedAt = this.now();
    return extractSpanishDateTimes(functions, capturedAt).map(({ date, time }) => ({
      movieTitle,
      venueName: 'Sala Nemesio',
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
