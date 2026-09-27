import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

interface LumaEvent {
  api_id?: string;
  name?: string;
  start_at?: string;
  timezone?: string;
  url?: string;
  geo_address_info?: {
    address?: string;
    city?: string;
    localized?: Record<string, { address?: string; city?: string }>;
  };
}

interface LumaResponse {
  entries?: Array<{ event?: LumaEvent }>;
}

function isMovieEvent(name: string): boolean {
  return /\bcine\b/i.test(name) && !/\b(?:tertulia|charla|taller|conversatorio)\b/i.test(name);
}

function movieTitle(name: string): string {
  let title = cleanText(name)
    .replace(/\s*\|\s*Duoc UC.*$/i, '')
    .replace(/^ciclo de cine\s*:\s*/i, '')
    .replace(/^cine club\s*:\s*/i, '')
    .replace(/^festival de cine[^|:-]*[|:-]\s*/i, '');
  if (title.includes('|')) title = cleanText(title.split('|').at(-1) ?? title);
  return cleanMovieTitle(title);
}

function venue(event: LumaEvent): string {
  const geo = event.geo_address_info;
  const localized = geo?.localized?.['es'];
  const address = localized?.address ?? geo?.address;
  const city = localized?.city ?? geo?.city;
  return cleanText(address && city ? `${address}, ${city}` : (address ?? 'Duoc UC'));
}

export class DuocLumaConnector implements SourceConnector {
  readonly id = 'duoc_luma';
  readonly name = 'Duoc UC A Puertas Abiertas';
  readonly type = 'api' as const;
  readonly sourceUrl = new URL('https://extension.duoc.cl/');
  private readonly apiUrl = new URL(
    'https://api.luma.com/calendar/get-items?calendar_api_id=cal-oHkme2Kdqru3GKs&period=future',
  );

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.apiUrl, {
      headers: {
        Accept: 'application/json',
        Origin: 'https://luma.com',
        Referer: 'https://luma.com/',
      },
    });
    const data = JSON.parse(response.body) as LumaResponse;
    const capturedAt = this.now().toISOString();
    return (data.entries ?? []).flatMap((entry): RawScreening[] => {
      const event = entry.event;
      const name = cleanText(event?.name ?? '');
      const title = movieTitle(name);
      if (!event?.start_at || !isMovieEvent(name) || !title || isNonMovieActivity(title)) return [];
      const eventUrl = event.url
        ? new URL(event.url, 'https://luma.com/').href
        : this.sourceUrl.href;
      return [
        {
          movieTitle: title,
          venueName: venue(event),
          startsAt: event.start_at,
          sourceTimezone: event.timezone ?? 'America/Santiago',
          sourceUrl: eventUrl,
          sourceType: this.type,
          sourceRecordKey: event.api_id ?? `${eventUrl}#${event.start_at}`,
          capturedAt,
        },
      ];
    });
  }
}
