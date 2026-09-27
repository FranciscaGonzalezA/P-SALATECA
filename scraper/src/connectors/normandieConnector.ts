import { load } from 'cheerio';
import type { RawScreening } from '../domain/screening.js';
import type { HttpClient } from '../http/httpClient.js';
import { eachDay, inferYear, isoDate, monthNumber, parseTime } from '../parsing/dates.js';
import { cleanMovieTitle, cleanText, isNonMovieActivity } from '../parsing/text.js';
import type { SourceConnector } from './sourceConnector.js';

const weekdayPattern = '(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)';

function validDate(year: number, month: number, day: number): Date | undefined {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
    ? value
    : undefined;
}

function parseWeekRange(label: string, reference: Date): { start: Date; end: Date } | undefined {
  const match = new RegExp(
    `${weekdayPattern}\\s+(\\d{1,2})(?:\\s+de\\s+([\\p{Letter}.]+))?\\s+al\\s+${weekdayPattern}\\s+(\\d{1,2})\\s+de\\s+([\\p{Letter}.]+)(?:\\s+(?:de\\s+)?(\\d{4}))?`,
    'iu',
  ).exec(cleanText(label));
  if (!match?.[1] || !match[3] || !match[4]) return undefined;
  const endMonth = monthNumber(match[4]);
  const startMonth = monthNumber(match[2] ?? match[4]);
  if (!startMonth || !endMonth) return undefined;
  const endDay = Number(match[3]);
  const endYear = Number(match[5] ?? inferYear(endMonth, endDay, reference));
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;
  const start = validDate(startYear, startMonth, Number(match[1]));
  const end = validDate(endYear, endMonth, endDay);
  return start && end && start <= end ? { start, end } : undefined;
}

export class NormandieConnector implements SourceConnector {
  readonly id = 'normandie';
  readonly name = 'Cine Arte Normandie';
  readonly type = 'website' as const;
  readonly sourceUrl = new URL('https://normandie.cl/cartelera/');

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async collect(): Promise<RawScreening[]> {
    const response = await this.http.get(this.sourceUrl);
    const $ = load(response.body);
    const capturedAt = this.now();
    const screenings: RawScreening[] = [];

    for (const container of $('.contenedorcartelera').toArray()) {
      const label = cleanText(
        $(container).find('.titulocartelera').first().text() || $(container).text(),
      );
      const range = parseWeekRange(label, capturedAt);
      if (!range) continue;
      const rangeDays = eachDay(range);

      for (const section of $(container).find('section').toArray()) {
        const header = cleanText($(section).find('h5').first().text());
        const dayMatch = new RegExp(`^${weekdayPattern}\\s+(\\d{1,2})$`, 'iu').exec(header);
        if (!dayMatch?.[1]) continue;
        const date = rangeDays.find((candidate) => candidate.getUTCDate() === Number(dayMatch[1]));
        if (!date) continue;

        for (const link of $(section).find('a[href*="flow.cl"]').toArray()) {
          const movieTitle = cleanMovieTitle($(link).text());
          if (!movieTitle || isNonMovieActivity(movieTitle)) continue;
          const spacedSection = $(section).clone();
          spacedSection.find('*').append(' ');
          const sectionText = cleanText(spacedSection.text());
          const titleIndex = sectionText.lastIndexOf(cleanText($(link).text()));
          const prefix = titleIndex >= 0 ? sectionText.slice(0, titleIndex) : sectionText;
          const times = [...prefix.matchAll(/\b\d{1,2}[:.]\d{2}\b/g)];
          const screeningTime = parseTime(times.at(-1)?.[0] ?? '');
          if (!screeningTime) continue;
          const sourceUrl = new URL($(link).attr('href') ?? this.sourceUrl.href, response.url);
          const screeningDate = isoDate(date);
          screenings.push({
            movieTitle,
            venueName: this.name,
            screeningDate,
            screeningTime,
            sourceTimezone: 'America/Santiago',
            sourceUrl: sourceUrl.href,
            sourceType: this.type,
            sourceRecordKey: `${sourceUrl.href}#${screeningDate}T${screeningTime}`,
            capturedAt: capturedAt.toISOString(),
          });
        }
      }
    }

    return screenings;
  }
}
