import type { MovieMetadataLookup, MovieMetadataProvider } from './metadata.types.js';
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
export declare class TmdbRequestError extends Error {
  constructor(message: string);
}
export declare function normalizeMovieTitleQueries(title: string): NormalizedMovieTitleQuery[];
export declare class TmdbClient implements MovieMetadataProvider {
  private readonly options;
  private readonly fetchImpl;
  private readonly language;
  private readonly fallbackLanguages;
  private readonly timeoutMs;
  constructor(options: TmdbClientOptions);
  findByTitle(title: string): Promise<MovieMetadataLookup>;
  private getMovieDetails;
  private mapDetails;
  private request;
}
