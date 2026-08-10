import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

function eventObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(eventObjects);
  if (typeof value !== 'object' || value === null) return [];
  const object = value as Record<string, unknown>;
  const type = object['@type'];
  const types = Array.isArray(type) ? type : [type];
  const current = types.includes('Event') ? [object] : [];
  return [...current, ...Object.values(object).flatMap(eventObjects)];
}

function objectName(value: unknown): string {
  if (Array.isArray(value)) return objectName(value[0]);
  if (typeof value !== 'object' || value === null) return '';
  const name = (value as Record<string, unknown>).name;
  return typeof name === 'string' ? cleanText(name) : '';
}

function nestedUrl(value: unknown): string | undefined {
  if (Array.isArray(value)) return nestedUrl(value[0]);
  if (typeof value !== 'object' || value === null) return undefined;
  const url = (value as Record<string, unknown>).url;
  return typeof url === 'string' ? url : undefined;
}

export class CinetecaConnector implements SourceConnector {
  readonly id = 'cineteca_nacional';
  readonly name = 'Cineteca Nacional de Chile';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://cinetecanacional.gob.cl/cartelera/');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.sourceUrl);
    const $ = load(response.body);
    const capturedAt = this.now();
    const screenings: RawScreening[] = [];

    for (const script of $('script[type="application/ld+json"]').toArray()) {
      const raw = $(script).text().trim();
      if (!raw) continue;
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }
      for (const event of eventObjects(data)) {
        const movieTitle = cleanMovieTitle(String(event.name ?? ''));
        const startDate = typeof event.startDate === 'string' ? event.startDate : undefined;
        if (!movieTitle || !startDate || isNonMovieActivity(movieTitle)) continue;
        const eventUrl =
          (typeof event.url === 'string' ? event.url : undefined) ?? nestedUrl(event.offers) ?? response.url.href;
        const locationName = objectName(event.location);
        screenings.push({
          movieTitle,
          venueName: locationName || this.name,
          startsAt: startDate,
          sourceTimezone: 'America/Santiago',
          sourceUrl: new URL(eventUrl, response.url).href,
          sourceType: this.type,
          sourceRecordKey: `${eventUrl}#${startDate}`,
          capturedAt: capturedAt.toISOString(),
        });
      }
    }

    return screenings;
  }
}
