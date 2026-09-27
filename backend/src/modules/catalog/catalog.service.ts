import type { CatalogFilters, CatalogPage, CatalogRepository } from './catalog.types.js';

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listCatalog(filters: CatalogFilters): Promise<CatalogPage> {
    return this.repository.listCatalog(filters);
  }

  findMovie(movieId: number) {
    return this.repository.findMovie(movieId);
  }

  listMovieScreenings(movieId: number) {
    return this.repository.listMovieScreenings(movieId);
  }

  listVenues() {
    return this.repository.listVenues();
  }

  listGenres() {
    return this.repository.listGenres();
  }
}
