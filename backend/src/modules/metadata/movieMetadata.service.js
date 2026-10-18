const metadataRefreshIntervalMs = 7 * 24 * 60 * 60 * 1_000;
function hasCompleteMetadata(movie) {
  return (
    movie.metadataSyncedAt !== null &&
    movie.metadataSyncedAt.getTime() >= Date.now() - metadataRefreshIntervalMs &&
    movie.tmdbVoteAverage !== null &&
    movie.tmdbVoteCount !== null &&
    movie.tmdbPopularity !== null
  );
}
function uniqueTargets(targets) {
  const byCanonicalTitle = new Map();
  for (const target of targets) {
    if (!byCanonicalTitle.has(target.canonicalTitle)) {
      byCanonicalTitle.set(target.canonicalTitle, target);
    }
  }
  return [...byCanonicalTitle.values()];
}
export class MovieMetadataService {
  repository;
  provider;
  concurrency;
  constructor(repository, provider, concurrency = 4) {
    this.repository = repository;
    this.provider = provider;
    this.concurrency = concurrency;
  }
  async enrichMovies(targets) {
    const pending = uniqueTargets(targets);
    const summary = {
      provider: 'tmdb',
      requested: pending.length,
      enriched: 0,
      alreadyComplete: 0,
      notFound: 0,
      ambiguous: 0,
      failed: 0,
      disabled: false,
    };
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < pending.length) {
        const target = pending[nextIndex];
        nextIndex += 1;
        if (!target) continue;
        try {
          const movie = await this.repository.findByCanonicalTitle(target.canonicalTitle);
          if (!movie) {
            summary.failed += 1;
            continue;
          }
          if (hasCompleteMetadata(movie)) {
            summary.alreadyComplete += 1;
            continue;
          }
          const lookup = await this.provider.findByTitle(target.title);
          if (lookup.status !== 'found') {
            summary[lookup.status === 'not_found' ? 'notFound' : 'ambiguous'] += 1;
            continue;
          }
          await this.repository.saveMetadata(movie.id, lookup.metadata);
          summary.enriched += 1;
        } catch (error) {
          summary.failed += 1;
          console.warn(
            `No fue posible enriquecer la metadata de “${target.title}”:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    };
    const workerCount = Math.min(Math.max(this.concurrency, 1), pending.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return summary;
  }
}
export function disabledMetadataSummary(requested) {
  return {
    provider: 'tmdb',
    requested,
    enriched: 0,
    alreadyComplete: 0,
    notFound: 0,
    ambiguous: 0,
    failed: 0,
    disabled: true,
  };
}
