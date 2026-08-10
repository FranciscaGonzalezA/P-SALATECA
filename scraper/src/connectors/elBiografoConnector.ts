import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { eachDay, isoDate, parseNamedMonthRange, parseTime } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

export class ElBiografoConnector implements SourceConnector {
  readonly id = 'el_biografo';
  readonly name = 'El Biógrafo';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://elbiografo.cl/#cartelera');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.sourceUrl);
    const $ = load(response.body);
    const capturedAt = this.now();
    const grid = $('.movies-grid').first();
    const range = parseNamedMonthRange(cleanText(grid.parent().text() || $('body').text()), capturedAt);
    if (!grid.length || !range) return [];

    const screenings: RawScreening[] = [];
    for (const card of grid.find('.movie-card').toArray()) {
      const movieTitle = cleanMovieTitle($(card).find('.movie-title').first().text());
      const screeningTime = parseTime($(card).find('.movie-time').first().text());
      if (!movieTitle || !screeningTime || isNonMovieActivity(movieTitle)) continue;

      for (const date of eachDay(range)) {
        const screeningDate = isoDate(date);
        screenings.push({
          movieTitle,
          venueName: this.name,
          screeningDate,
          screeningTime,
          sourceTimezone: 'America/Santiago',
          sourceUrl: response.url.href,
          sourceType: this.type,
          sourceRecordKey: `${movieTitle}:${screeningDate}T${screeningTime}`,
          capturedAt: capturedAt.toISOString(),
        });
      }
    }
    return screenings;
  }
}
