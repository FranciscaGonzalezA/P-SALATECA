import type { Pool } from 'mysql2/promise';
import type {
  MovieMetadata,
  MovieMetadataRepository,
  StoredMovieMetadataState,
} from './metadata.types.js';
export declare class MysqlMovieMetadataRepository implements MovieMetadataRepository {
  private readonly pool;
  constructor(pool?: Pool);
  findByCanonicalTitle(canonicalTitle: string): Promise<StoredMovieMetadataState | null>;
  saveMetadata(movieId: number, metadata: MovieMetadata): Promise<void>;
}
