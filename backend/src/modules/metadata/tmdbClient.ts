import type {
  MovieMetadata,
  MovieMetadataLookup,
  MovieMetadataProvider,
} from './metadata.types.js';

interface TmdbSearchResult {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
}

interface TmdbSearchResponse {
  results?: TmdbSearchResult[];
}

interface TmdbMovieDetails {
  id: number;
  original_title?: string;
  release_date?: string;
  runtime?: number;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genres?: Array<{ name?: string }>;
  credits?: {
    crew?: Array<{ job?: string; name?: string }>;
  };
  alternative_titles?: {
    titles?: Array<{ title?: string }>;
  };
}

export interface TmdbClientOptions {
  readAccessToken?: string | undefined;
  apiKey?: string | undefined;
  language?: string | undefined;
  fallbackLanguages?: readonly string[] | undefined;
  timeoutMs?: number | undefined;
  fetchImpl?: typeof fetch | undefined;
}

export interface NormalizedMovieTitleQuery {
  query: string;
  year?: number | undefined;
}

export class TmdbRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TmdbRequestError';
  }
}

const editionQualifier =
  /^(?:doblada|subtitulada|versi[oó]n extendida|director(?:'|’)s cut|corte del director|reestreno|restaurada|remasterizada|[234]d|4k|funci[oó]n especial)$/iu;
const programmingQualifier = /^(?:ciclo|cine|funci[oó]n|especial|muestra|festival)\b/iu;

function cleanTitle(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—−]/g, '-')
    .trim()
    .replace(/\s+/g, ' ');
}

function comparableTitle(value: string): string {
  return cleanTitle(value)
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .normalize('NFC')
    .toLocaleLowerCase('es-CL')
    .replace(/&/g, ' y ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function withoutLeadingArticle(value: string): string {
  const words = value.split(' ');
  if (words.length < 2) return value;
  return /^(?:el|la|los|las|un|una|unos|unas)$/u.test(words[0] ?? '')
    ? words.slice(1).join(' ')
    : value;
}

function addQuery(
  queries: NormalizedMovieTitleQuery[],
  seen: Set<string>,
  query: string,
  year?: number,
): void {
  const cleaned = cleanTitle(query)
    .replace(/^["']+|["']+$/g, '')
    .trim();
  const key = comparableTitle(cleaned);
  if (!key || seen.has(key)) return;
  seen.add(key);
  queries.push({ query: cleaned, ...(year ? { year } : {}) });
}

export function normalizeMovieTitleQueries(title: string): NormalizedMovieTitleQuery[] {
  const queries: NormalizedMovieTitleQuery[] = [];
  const seen = new Set<string>();
  let base = cleanTitle(title);
  let year: number | undefined;
  const yearMatch = /\s*[([]((?:18|19|20)\d{2})[)\]]\s*$/u.exec(base);
  if (yearMatch?.[1]) {
    year = Number(yearMatch[1]);
    base = base.slice(0, yearMatch.index).trim();
  }

  addQuery(queries, seen, base, year);

  const parenthetical = /^(.*?)\s*[([]([^()[\]]+)[)\]]\s*$/u.exec(base);
  if (parenthetical?.[1] && parenthetical[2]) {
    const outside = parenthetical[1].trim();
    const inside = parenthetical[2].trim();
    addQuery(queries, seen, outside, year);
    if (!editionQualifier.test(inside)) addQuery(queries, seen, inside, year);
  }

  const colonEdition = /^(.*?):\s*(.+)$/u.exec(base);
  if (colonEdition?.[1] && colonEdition[2] && editionQualifier.test(colonEdition[2].trim())) {
    addQuery(queries, seen, colonEdition[1], year);
  }

  const slashParts = base.split(/\s*\/\s*/u).filter(Boolean);
  if (slashParts.length > 1) {
    for (const [index, part] of slashParts.entries()) {
      if (index === 0 || !programmingQualifier.test(part)) addQuery(queries, seen, part, year);
    }
  }

  const programmingSuffix = /^(.*?)\s*[-:]\s*((?:ciclo|cine|muestra|festival)\b.*)$/iu.exec(base);
  if (programmingSuffix?.[1]) addQuery(queries, seen, programmingSuffix[1], year);

  return queries;
}

function exactMatches(
  results: readonly TmdbSearchResult[],
  query: NormalizedMovieTitleQuery,
): TmdbSearchResult[] {
  const scored = results.flatMap((candidate) => {
    if (query.year && releaseYear(candidate.release_date) !== query.year) return [];
    const score = Math.max(
      titleMatchScore(candidate.title, query.query),
      titleMatchScore(candidate.original_title, query.query),
    );
    return score > 0 ? [{ candidate, score }] : [];
  });
  const bestScore = Math.max(0, ...scored.map((match) => match.score));
  return [
    ...new Map(
      scored
        .filter((match) => match.score === bestScore)
        .map((match) => [match.candidate.id, match.candidate]),
    ).values(),
  ];
}

function titleMatchScore(candidateTitle: string, requestedTitle: string): number {
  const candidate = comparableTitle(candidateTitle);
  const expected = comparableTitle(requestedTitle);
  if (candidate === expected) return 2;
  const expectedWithoutArticle = withoutLeadingArticle(expected);
  if (
    expectedWithoutArticle.length >= 10 &&
    withoutLeadingArticle(candidate) === expectedWithoutArticle
  ) {
    return 1;
  }
  return 0;
}

function alternativeTitleMatches(
  details: TmdbMovieDetails,
  query: NormalizedMovieTitleQuery,
): boolean {
  if (query.year && releaseYear(details.release_date) !== query.year) return false;
  return (details.alternative_titles?.titles ?? []).some(
    (alternative) => alternative.title && titleMatchScore(alternative.title, query.query) > 0,
  );
}

function releaseYear(releaseDate: string | undefined): number | null {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(releaseDate ?? '');
  return match?.[1] ? Number(match[1]) : null;
}

function nonEmpty(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function finiteNumber(value: number | undefined, minimum: number, maximum?: number): number | null {
  if (!Number.isFinite(value) || value === undefined || value < minimum) return null;
  if (maximum !== undefined && value > maximum) return null;
  return value;
}

export class TmdbClient implements MovieMetadataProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly language: string;
  private readonly fallbackLanguages: readonly string[];
  private readonly timeoutMs: number;

  constructor(private readonly options: TmdbClientOptions) {
    if (!options.readAccessToken && !options.apiKey) {
      throw new Error('TMDB requiere TMDB_READ_ACCESS_TOKEN o TMDB_API_KEY.');
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.language = options.language ?? 'es-CL';
    this.fallbackLanguages = [...new Set(options.fallbackLanguages ?? ['es-ES', 'en-US'])].filter(
      (language) => language !== this.language,
    );
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async findByTitle(title: string): Promise<MovieMetadataLookup> {
    let match: TmdbSearchResult | undefined;
    let firstMovieCandidate: TmdbSearchResult | undefined;
    const unresolvedSearches: Array<{
      query: NormalizedMovieTitleQuery;
      results: TmdbSearchResult[];
    }> = [];
    for (const query of normalizeMovieTitleQueries(title)) {
      const search = await this.request<TmdbSearchResponse>('/3/search/movie', {
        query: query.query,
        include_adult: 'false',
        language: this.language,
        ...(query.year ? { year: String(query.year) } : {}),
      });
      const results = search.results ?? [];
      firstMovieCandidate ??= results.find(
        (candidate) => !query.year || releaseYear(candidate.release_date) === query.year,
      );
      const matches = exactMatches(results, query);
      if (matches.length > 0) {
        match = matches[0];
        break;
      }
      unresolvedSearches.push({ query, results: results.slice(0, 3) });
    }

    if (!match) {
      const detailsCache = new Map<number, Promise<TmdbMovieDetails>>();
      for (const search of unresolvedSearches) {
        const candidates = await Promise.all(
          search.results.map((candidate) => {
            let details = detailsCache.get(candidate.id);
            if (!details) {
              details = this.getMovieDetails(candidate.id);
              detailsCache.set(candidate.id, details);
            }
            return details;
          }),
        );
        const alternativeMatches = candidates.filter((details) =>
          alternativeTitleMatches(details, search.query),
        );
        if (alternativeMatches.length > 0) {
          return { status: 'found', metadata: this.mapDetails(alternativeMatches[0]!) };
        }
      }
      if (!firstMovieCandidate) return { status: 'not_found' };
      const firstDetails = detailsCache.get(firstMovieCandidate.id);
      return {
        status: 'found',
        metadata: this.mapDetails(
          await (firstDetails ?? this.getMovieDetails(firstMovieCandidate.id)),
        ),
      };
    }

    const details = await this.getMovieDetails(match.id);
    return { status: 'found', metadata: this.mapDetails(details) };
  }

  private async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
    let details = await this.request<TmdbMovieDetails>(`/3/movie/${movieId}`, {
      append_to_response: 'alternative_titles,credits',
      language: this.language,
    });

    for (const language of this.fallbackLanguages) {
      if (nonEmpty(details.overview) && details.poster_path) break;
      const fallback = await this.request<TmdbMovieDetails>(`/3/movie/${movieId}`, {
        append_to_response: 'alternative_titles,credits',
        language,
      });
      const overview = nonEmpty(details.overview) ?? nonEmpty(fallback.overview);
      const posterPath = details.poster_path ?? fallback.poster_path;
      details = {
        ...details,
        ...(overview ? { overview } : {}),
        ...(posterPath ? { poster_path: posterPath } : {}),
      };
    }

    return details;
  }

  private mapDetails(details: TmdbMovieDetails): MovieMetadata {
    const directors = [
      ...new Set(
        (details.credits?.crew ?? [])
          .filter((member) => member.job === 'Director')
          .map((member) => member.name?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ];

    return {
      tmdbId: details.id,
      originalTitle: nonEmpty(details.original_title),
      releaseYear: releaseYear(details.release_date),
      durationMinutes:
        typeof details.runtime === 'number' && details.runtime > 0 ? details.runtime : null,
      director: directors.length > 0 ? directors.join(' y ') : null,
      synopsis: nonEmpty(details.overview),
      tmdbVoteAverage: finiteNumber(details.vote_average, 0, 10),
      tmdbVoteCount: finiteNumber(details.vote_count, 0),
      tmdbPopularity: finiteNumber(details.popularity, 0),
      genres: [
        ...new Set(
          (details.genres ?? [])
            .map((genre) => genre.name?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      ],
      posterUrl: details.poster_path
        ? `https://image.tmdb.org/t/p/w780${details.poster_path}`
        : null,
    };
  }

  private async request<T>(pathname: string, parameters: Record<string, string>): Promise<T> {
    const url = new URL(pathname, 'https://api.themoviedb.org');
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    if (!this.options.readAccessToken && this.options.apiKey) {
      url.searchParams.set('api_key', this.options.apiKey);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          ...(this.options.readAccessToken
            ? { Authorization: `Bearer ${this.options.readAccessToken}` }
            : {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new TmdbRequestError(
        timedOut
          ? 'TMDB tardó demasiado en responder. Intenta nuevamente.'
          : 'No fue posible conectarse con TMDB. Revisa la conexión e intenta nuevamente.',
      );
    }
    if (!response.ok) {
      throw new TmdbRequestError(`TMDB respondió HTTP ${response.status}.`);
    }
    return (await response.json()) as T;
  }
}
