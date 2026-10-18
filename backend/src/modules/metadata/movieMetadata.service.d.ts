import type {
  MovieMetadataEnricher,
  MovieMetadataEnrichmentSummary,
  MovieMetadataProvider,
  MovieMetadataRepository,
  MovieMetadataTarget,
} from './metadata.types.js';
export declare class MovieMetadataService implements MovieMetadataEnricher {
  private readonly repository;
  private readonly provider;
  private readonly concurrency;
  constructor(
    repository: MovieMetadataRepository,
    provider: MovieMetadataProvider,
    concurrency?: number,
  );
  enrichMovies(targets: readonly MovieMetadataTarget[]): Promise<MovieMetadataEnrichmentSummary>;
}
export declare function disabledMetadataSummary(requested: number): MovieMetadataEnrichmentSummary;
