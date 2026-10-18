export class CatalogService {
  repository;
  constructor(repository) {
    this.repository = repository;
  }
  listCatalog(filters) {
    return this.repository.listCatalog(filters);
  }
  findMovie(movieId) {
    return this.repository.findMovie(movieId);
  }
  listMovieScreenings(movieId) {
    return this.repository.listMovieScreenings(movieId);
  }
  listVenues() {
    return this.repository.listVenues();
  }
  listGenres() {
    return this.repository.listGenres();
  }
}
