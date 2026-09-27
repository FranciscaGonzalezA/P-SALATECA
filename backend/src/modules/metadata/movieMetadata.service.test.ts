import { describe, expect, it, vi } from 'vitest';
import { MovieMetadataService } from './movieMetadata.service.js';
import type {
  MovieMetadata,
  MovieMetadataProvider,
  MovieMetadataRepository,
  StoredMovieMetadataState,
} from './metadata.types.js';

const metadata: MovieMetadata = {
  tmdbId: 7,
  originalTitle: 'Original',
  releaseYear: 2020,
  durationMinutes: 90,
  director: 'Directora',
  synopsis: 'Sinopsis',
  tmdbVoteAverage: 7.8,
  tmdbVoteCount: 250,
  tmdbPopularity: 12.5,
  genres: ['Drama'],
  posterUrl: 'https://image.tmdb.org/poster.jpg',
};

function storedMovie(overrides: Partial<StoredMovieMetadataState> = {}): StoredMovieMetadataState {
  return {
    id: 1,
    title: 'Película',
    tmdbId: null,
    originalTitle: null,
    releaseYear: null,
    durationMinutes: null,
    director: null,
    synopsis: null,
    tmdbVoteAverage: null,
    tmdbVoteCount: null,
    tmdbPopularity: null,
    hasPoster: false,
    hasGenres: false,
    metadataSyncedAt: null,
    ...overrides,
  };
}

describe('MovieMetadataService', () => {
  it('deduplica títulos, omite fichas sincronizadas y guarda las encontradas', async () => {
    const repository: MovieMetadataRepository = {
      findByCanonicalTitle: vi
        .fn()
        .mockResolvedValueOnce(storedMovie())
        .mockResolvedValueOnce(
          storedMovie({
            id: 2,
            tmdbId: 9,
            tmdbVoteAverage: 7,
            tmdbVoteCount: 100,
            tmdbPopularity: 10,
            metadataSyncedAt: new Date(),
          }),
        ),
      saveMetadata: vi.fn(),
    };
    const provider: MovieMetadataProvider = {
      findByTitle: vi.fn().mockResolvedValue({ status: 'found', metadata }),
    };
    const service = new MovieMetadataService(repository, provider, 1);

    const result = await service.enrichMovies([
      { title: 'Película', canonicalTitle: 'pelicula' },
      { title: 'Película', canonicalTitle: 'pelicula' },
      { title: 'Otra', canonicalTitle: 'otra' },
    ]);

    expect(result).toMatchObject({ requested: 2, enriched: 1, alreadyComplete: 1, failed: 0 });
    expect(provider.findByTitle).toHaveBeenCalledOnce();
    expect(repository.saveMetadata).toHaveBeenCalledWith(1, metadata);
  });

  it('resume resultados no encontrados, ambiguos y fallidos sin detener el lote', async () => {
    const repository: MovieMetadataRepository = {
      findByCanonicalTitle: vi
        .fn()
        .mockResolvedValueOnce(storedMovie({ id: 1 }))
        .mockResolvedValueOnce(storedMovie({ id: 2 }))
        .mockResolvedValueOnce(storedMovie({ id: 3 })),
      saveMetadata: vi.fn(),
    };
    const provider: MovieMetadataProvider = {
      findByTitle: vi
        .fn()
        .mockResolvedValueOnce({ status: 'not_found' })
        .mockResolvedValueOnce({ status: 'ambiguous' })
        .mockRejectedValueOnce(new Error('sin conexión')),
    };

    const result = await new MovieMetadataService(repository, provider, 1).enrichMovies([
      { title: 'Uno', canonicalTitle: 'uno' },
      { title: 'Dos', canonicalTitle: 'dos' },
      { title: 'Tres', canonicalTitle: 'tres' },
    ]);

    expect(result).toMatchObject({ notFound: 1, ambiguous: 1, failed: 1, enriched: 0 });
    expect(repository.saveMetadata).not.toHaveBeenCalled();
  });
});
