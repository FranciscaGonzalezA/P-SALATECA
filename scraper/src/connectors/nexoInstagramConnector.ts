import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { extractNamedDateTimes } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

interface InstagramMedia {
  id?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
}

interface InstagramMediaResponse {
  data?: InstagramMedia[];
}

function looksLikeMoviePost(text: string): boolean {
  const include = /\b(?:cartelera|funciones?|cine|pel[iÃ­]cula|documental|estreno|sala)\b/i.test(
    text,
  );
  const exclude = /\b(?:charla|taller|conversatorio|casting|convocatoria|curso)\b/i.test(text);
  return include && !exclude;
}

function titleFromCaption(caption: string): string {
  const quoted = /[â€œâ€"'â€˜â€™]([^â€œâ€"'â€˜â€™]{3,90})[â€œâ€"'â€˜â€™]/.exec(caption);
  const marked = /(?:pel[iÃ­]cula|documental|film|t[iÃ­]tulo)\s*:\s*([^\n.]+)/i.exec(caption);
  const firstLine = caption.split(/\r?\n/).find((line) => {
    const cleaned = cleanText(line);
    return (
      cleaned.length >= 3 &&
      cleaned.length <= 90 &&
      !/\b(?:cartelera|funciones?|horarios?|sala)\b/i.test(cleaned)
    );
  });
  return cleanMovieTitle(quoted?.[1] ?? marked?.[1] ?? firstLine ?? '');
}

function venueFromCaption(caption: string): string {
  const line = caption
    .split(/\r?\n/)
    .find((value) => /\b(?:sala|cine|centro cultural|teatro)\b/i.test(value));
  return cleanText(line ?? 'Nexo Cinema').slice(0, 120);
}

export class NexoInstagramConnector implements SourceConnector {
  readonly id = 'nexo_instagram';
  readonly name = 'Nexo Cinema';
  readonly type = 'social_media' as const;
  readonly sourceUrl = new URL('https://www.instagram.com/nexocinema/');
  private readonly apiUrl = new URL(
    'https://graph.instagram.com/me/media?fields=id,caption,permalink,timestamp&limit=25',
  );

  constructor(
    private readonly http: HttpClient,
    private readonly accessToken: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.apiUrl, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${this.accessToken}` },
    });
    const data = JSON.parse(response.body) as InstagramMediaResponse;
    const capturedAt = this.now().toISOString();
    return (data.data ?? []).flatMap((media): RawScreening[] => {
      const caption = cleanText(media.caption ?? '');
      const title = titleFromCaption(media.caption ?? '');
      const reference = media.timestamp ? new Date(media.timestamp) : this.now();
      const sourceUrl = media.permalink ?? this.sourceUrl.href;
      if (!caption || !looksLikeMoviePost(caption) || !title || isNonMovieActivity(title))
        return [];
      return extractNamedDateTimes(media.caption ?? '', reference).map(({ date, time }) => ({
        movieTitle: title,
        venueName: venueFromCaption(media.caption ?? ''),
        screeningDate: date,
        screeningTime: time,
        sourceTimezone: 'America/Santiago',
        sourceUrl,
        sourceType: this.type,
        sourceRecordKey: `${media.id ?? sourceUrl}#${date}T${time}`,
        capturedAt,
      }));
    });
  }
}
