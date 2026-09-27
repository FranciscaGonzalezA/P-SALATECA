import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { extractSpanishDateTimes } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

function pageText(html: string): string {
  const $ = load(html);
  const body = $('body').clone();
  body.find('*').append(' ');
  return cleanText(body.text());
}

function movieEvidence(text: string): boolean {
  return /\bsinopsis\b/i.test(text) && /\b(?:ficha t.cnica|direcci.n|duraci.n)\b/i.test(text);
}

function venueFromText(text: string): string {
  if (/Centro Arte Alameda\s*\/\s*Sala CEINA/i.test(text)) {
    return 'Centro Arte Alameda / Sala CEINA';
  }
  return 'Centro Arte Alameda';
}

function functionSection(text: string): string {
  const start = text.search(/seleccione el d.a/i);
  const end = text.search(/funci.n seleccionada/i);
  return start >= 0 && end > start ? text.slice(start, end) : text;
}

export class PasslineAlamedaConnector implements SourceConnector {
  readonly id = 'passline_alameda';
  readonly name = 'Centro Arte Alameda - Passline';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://www.passline.com/venue/centro-arte-alameda');

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
      if (href && /\/eventos\//i.test(href)) links.add(new URL(href, listing.url).href);
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
    const text = pageText(html);
    const movieTitle = cleanMovieTitle(
      ($('h1').first().text() || $('title').first().text()).replace(
        /\s*\/\s*Centro Arte Alameda.*$/i,
        '',
      ),
    );
    if (!movieTitle || isNonMovieActivity(movieTitle) || !movieEvidence(text)) return [];
    const capturedAt = this.now();
    return extractSpanishDateTimes(functionSection(text), capturedAt).map(({ date, time }) => ({
      movieTitle,
      venueName: venueFromText(text),
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
