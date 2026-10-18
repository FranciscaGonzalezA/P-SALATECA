export class AdminMovieMetadataService {
  repository;
  provider;
  constructor(repository, provider) {
    this.repository = repository;
    this.provider = provider;
  }
  listPending() {
    return this.repository.listPendingMetadataReviews(50);
  }
  async searchCandidates(movieId, query) {
    const movie = await this.repository.findPendingMetadataReview(movieId);
    if (!movie) return null;
    this.requireProvider();
    return this.provider.searchCandidates(query?.trim() || movie.title);
  }
  async resolve(movieId, tmdbId) {
    const movie = await this.repository.findPendingMetadataReview(movieId);
    if (!movie) return { status: 'movie_not_pending' };
    this.requireProvider();
    const metadata = await this.provider.findById(tmdbId);
    if (!metadata) return { status: 'candidate_not_found' };
    await this.repository.saveMetadata(movie.id, metadata);
    return { status: 'resolved', movieId: movie.id, tmdbId: metadata.tmdbId };
  }
  requireProvider() {
    if (!this.provider) throw new TmdbNotConfiguredError();
  }
}
export class TmdbNotConfiguredError extends Error {
  constructor() {
    super('TMDB no está configurado.');
  }
}
