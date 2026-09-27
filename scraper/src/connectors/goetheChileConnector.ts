import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { parseTime } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

function filmTitle(text: string, fallback: string): string {
  const match = /(?:cine|pel.cula|film)\s*[|:]\s*["'“”]?(.+?)(?:["'“”]?\s*\(\d{4}\)|$)/i.exec(text);
  return cleanMovieTitle(match?.[1] ?? fallback);
}

function isSantiagoOnsite(text: string): boolean {
  if (/\b(?:en l.nea|online)\b/i.test(text)) return false;
  if (/\b(?:Puerto Montt|Torres del Paine|Magallanes)\b/i.test(text)) return false;
  return /\bSantiago\b|Goethe-Institut Chile/i.test(text);
}

function venueFromText(text: string): string {
  const known = [
    'Goethe-Institut Chile',
    'Biblioteca del Goethe-Institut Chile',
    'Casa del Arte Diego Rivera',
  ];
  return (
    known.find((venue) =>
      text.toLocaleLowerCase('es-CL').includes(venue.toLocaleLowerCase('es-CL')),
    ) ?? 'Goethe-Institut Chile'
  );
}

export class GoetheChileConnector implements SourceConnector {
  readonly id = 'goethe_chile';
  readonly name = 'Goethe-Institut Chile';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://www.goethe.de/ins/cl/es/ver.cfm');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.sourceUrl);
    const $ = load(response.body);
    const capturedAt = this.now().toISOString();
    const records: RawScreening[] = [];

    for (const card of $('article.teaser-card').toArray()) {
      const cardContent = $(card).clone();
      cardContent.find('*').append(' ');
      const text = cleanText(cardContent.text());
      if (!isSantiagoOnsite(text)) continue;
      const title = filmTitle(text, $(card).find('.teaser-heading, h3').first().text());
      const dateValue = $(card).find('time[datetime]').first().attr('datetime');
      const dateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(dateValue ?? '');
      const clockText = /\b\d{1,2}:\d{2}\b/.exec(text)?.[0];
      const time = clockText ? parseTime(clockText) : undefined;
      if (!title || isNonMovieActivity(title) || !dateMatch?.[1] || !time) continue;
      const href = $(card).find('a[href]').first().attr('href');
      const sourceUrl = href ? new URL(href, response.url).href : response.url.href;
      records.push({
        movieTitle: title,
        venueName: venueFromText(text),
        screeningDate: dateMatch[1],
        screeningTime: time,
        sourceTimezone: 'America/Santiago',
        sourceUrl,
        sourceType: this.type,
        sourceRecordKey: `${sourceUrl}#${dateMatch[1]}T${time}`,
        capturedAt,
      });
    }

    return records;
  }
}
