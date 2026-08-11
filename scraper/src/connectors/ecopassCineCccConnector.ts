import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { cleanMovieTitle, cleanText } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

interface EcopassEvent {
  id?: string | number;
  name?: string;
  startDate?: string;
  address?: string;
  addressObject?: { description?: string };
}

interface NextData {
  props?: {
    pageProps?: {
      events?: EcopassEvent[];
      producerData?: { name?: string };
    };
  };
}

export class EcopassCineCccConnector implements SourceConnector {
  readonly id = 'ecopass_cine_ccc';
  readonly name = 'Cine CCC - Ecopass';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://www.ecopass.cl/producers/productor/2368');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.sourceUrl);
    const $ = load(response.body);
    const raw = $('#__NEXT_DATA__').text().trim();
    if (!raw) throw new Error('Ecopass no expuso el bloque __NEXT_DATA__.');
    const data = JSON.parse(raw) as NextData;
    const page = data.props?.pageProps;
    const producer = cleanText(page?.producerData?.name ?? this.name);
    const capturedAt = this.now().toISOString();

    return (page?.events ?? []).flatMap((event): RawScreening[] => {
      const rawName = cleanText(event.name ?? '');
      if (!/\bcine\b/i.test(rawName) || !event.startDate) return [];
      const movieTitle = cleanMovieTitle(rawName.replace(/^cine\s*ccc\s*:\s*/i, ''));
      if (!movieTitle) return [];
      const venueName = cleanText(event.addressObject?.description ?? event.address ?? producer);
      return [
        {
          movieTitle,
          venueName,
          startsAt: event.startDate,
          sourceTimezone: 'America/Santiago',
          sourceUrl: response.url.href,
          sourceType: this.type,
          sourceRecordKey: String(event.id ?? `${rawName}#${event.startDate}`),
          capturedAt,
        },
      ];
    });
  }
}
