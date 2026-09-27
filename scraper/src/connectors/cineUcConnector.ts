import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { extractSpanishDateTimes, monthNumber } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

function fallbackDate(text: string): { month: number; year: number } | undefined {
  const match = /\b\d{1,2}\s+(?:de\s+)?([\p{Letter}.]+)\s+(\d{4})\s+al\b/iu.exec(text);
  const month = match?.[1] ? monthNumber(match[1]) : undefined;
  return month && match?.[2] ? { month, year: Number(match[2]) } : undefined;
}

function titleFromHeading(value: string): string {
  return cleanMovieTitle(value.replace(/\s*,\s*(?:de|dirigid[ao] por)\s+.+$/i, ''));
}

function venueFromText(text: string): string {
  const match = /Lugar\s+(.+?)(?:Entrada|Programaci.n|$)/i.exec(text);
  return cleanText(match?.[1] ?? 'Sala de cine, Centro Extensión Alameda');
}

export class CineUcConnector implements SourceConnector {
  readonly id = 'cine_uc';
  readonly name = 'Cine UC';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://extension.uc.cl/cine-uc/cine-uc/');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const listing = await this.http.get(this.sourceUrl);
    if (/Verificaci.n de Seguridad|Security Verification/i.test(listing.body)) {
      throw new Error('Cine UC bloqueó la consulta con su verificación de seguridad.');
    }
    const $ = load(listing.body);
    const currentHref = $('a[href*="/cartelera_cine/"]').first().attr('href');
    if (!currentHref) return [];
    const detail = await this.http.get(new URL(currentHref, listing.url));
    return this.parseDetail(detail.body, detail.url);
  }

  private parseDetail(html: string, sourceUrl: URL): RawScreening[] {
    const $ = load(html);
    const body = $('body').clone();
    body.find('*').append(' ');
    const fullText = cleanText(body.text());
    const dateFallback = fallbackDate(fullText);
    const venueName = venueFromText(fullText);
    const capturedAt = this.now();
    const records: RawScreening[] = [];
    let programmingStarted = false;

    for (const heading of $('h2, h3').toArray()) {
      const headingText = cleanText($(heading).text());
      if (/^programaci.n$/i.test(headingText)) {
        programmingStarted = true;
        continue;
      }
      if (!programmingStarted) continue;
      const fragments: string[] = [];
      let sibling = $(heading).next();
      while (sibling.length && !sibling.is('h2, h3')) {
        fragments.push(cleanText(sibling.text()));
        sibling = sibling.next();
      }
      const movieTitle = titleFromHeading(headingText);
      if (!movieTitle || isNonMovieActivity(movieTitle)) continue;
      const functionText = cleanText(fragments.join(' '));
      for (const { date, time } of extractSpanishDateTimes(
        functionText,
        capturedAt,
        dateFallback,
      )) {
        records.push({
          movieTitle,
          venueName,
          screeningDate: date,
          screeningTime: time,
          sourceTimezone: 'America/Santiago',
          sourceUrl: sourceUrl.href,
          sourceType: this.type,
          sourceRecordKey: `${sourceUrl.href}#${movieTitle}#${date}T${time}`,
          capturedAt: capturedAt.toISOString(),
        });
      }
    }

    return records;
  }
}
