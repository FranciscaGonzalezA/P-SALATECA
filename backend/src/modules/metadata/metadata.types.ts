export interface MovieMetadataTarget {
  title: string;
  canonicalTitle: string;
}

export interface StoredMovieMetadataState {
  id: number;
  title: string;
  tmdbId: number | null;
  originalTitle: string | null;
  releaseYear: number | null;
  durationMinutes: number | null;
  director: string | null;
  synopsis: string | null;
  hasPoster: boolean;
  hasGenres: boolean;
  metadataSyncedAt: Date | null;
}

export interface MovieMetadata {
  tmdbId: number;
  originalTitle: string | null;
  releaseYear: number | null;
  durationMinutes: number | null;
  director: string | null;
  synopsis: string | null;
  genres: string[];
  posterUrl: string | null;
}

export type MovieMetadataLookup =
  { status: 'found'; metadata: MovieMetadata } | { status: 'not_found' | 'ambiguous' };

export interface MovieMetadataProvider {
  findByTitle(title: string): Promise<MovieMetadataLookup>;
}

export interface MovieMetadataRepository {
  findByCanonicalTitle(canonicalTitle: string): Promise<StoredMovieMetadataState | null>;
  saveMetadata(movieId: number, metadata: MovieMetadata): Promise<void>;
}

export interface MovieMetadataEnrichmentSummary {
  provider: 'tmdb';
  requested: number;
  enriched: number;
  alreadyComplete: number;
  notFound: number;
  ambiguous: number;
  failed: number;
  disabled: boolean;
}

export interface MovieMetadataEnricher {
  enrichMovies(targets: readonly MovieMetadataTarget[]): Promise<MovieMetadataEnrichmentSummary>;
}
