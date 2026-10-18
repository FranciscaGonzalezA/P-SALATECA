import type { AdminMovieMetadataProvider, AdminMovieMetadataRepository } from './metadata.types.js';
export type MovieMetadataResolutionResult =
  | {
      status: 'resolved';
      movieId: number;
      tmdbId: number;
    }
  | {
      status: 'movie_not_pending';
    }
  | {
      status: 'candidate_not_found';
    };
export declare class AdminMovieMetadataService {
  private readonly repository;
  private readonly provider?;
  constructor(
    repository: AdminMovieMetadataRepository,
    provider?: AdminMovieMetadataProvider | undefined,
  );
  listPending(): Promise<import('./metadata.types.js').PendingMovieMetadataReview[]>;
  searchCandidates(
    movieId: number,
    query?: string,
  ): Promise<import('./metadata.types.js').MovieMetadataCandidate[] | null>;
  resolve(movieId: number, tmdbId: number): Promise<MovieMetadataResolutionResult>;
  private requireProvider;
}
export declare class TmdbNotConfiguredError extends Error {
  constructor();
}
