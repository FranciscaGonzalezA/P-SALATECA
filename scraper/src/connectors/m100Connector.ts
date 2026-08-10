import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { eachDay, isoDate, parseNumericDateRange, parseTime, parseWeekdayRange } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

export class M100Connector implements SourceConnector {
  readonly id = 'm100_cine';
  readonly name = 'Matucana 100';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://www.m100.cl/programacion/cine/');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const listing = await this.http.get(this.sourceUrl);
    const $ = load(listing.body);
    const links = new Set<string>();
    for (const card of $('article.post-card, .post-card').toArray()) {
      const href = $(card).find('a[href]').first().attr('href');
      if (href) links.add(new URL(href, listing.url).href);
    }

    const screenings: RawScreening[] = [];
    for (const href of links) {
      try {
        const detail = await this.http.get(new URL(href));
        screenings.push(...this.parseDetail(detail.body, detail.url));
      } catch (error) {
        console.warn(`[scraper:${this.id}] detalle omitido ${href}:`, error);
      }
    }
    return screenings;
  }

  private parseDetail(html: string, sourceUrl: URL): RawScreening[] {
    const $ = load(html);
    const movieTitle = cleanMovieTitle($('h1').first().text());
    const spacedBody = $('body').clone();
    spacedBody.find('*').append(' ');
    const text = cleanText(spacedBody.text());
    const range = parseNumericDateRange(text, this.now());
    const scheduleMatch = /\b(?:lun(?:es)?|mar(?:tes)?|mi[eé](?:rcoles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?)(?:\s+a\s+(?:lun(?:es)?|mar(?:tes)?|mi[eé](?:rcoles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?))?\s*[–—-]\s*\d{1,2}[:.]\d{2}/i.exec(
      text,
    )?.[0];
    const allowedWeekdays = scheduleMatch ? parseWeekdayRange(scheduleMatch) : undefined;
    const screeningTime = scheduleMatch ? parseTime(scheduleMatch) : undefined;
    if (!movieTitle || isNonMovieActivity(movieTitle) || !range || !allowedWeekdays || !screeningTime) {
      return [];
    }
    const capturedAt = this.now();
    return eachDay(range, allowedWeekdays).map((date) => {
      const screeningDate = isoDate(date);
      return {
        movieTitle,
        venueName: this.name,
        screeningDate,
        screeningTime,
        sourceTimezone: 'America/Santiago',
        sourceUrl: sourceUrl.href,
        sourceType: this.type,
        sourceRecordKey: `${sourceUrl.href}#${screeningDate}T${screeningTime}`,
        capturedAt: capturedAt.toISOString(),
      };
    });
  }
}
