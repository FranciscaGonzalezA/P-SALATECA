import type { CatalogFilters, CatalogPage, CatalogRepository } from './catalog.types.js';
export declare class CatalogService {
  private readonly repository;
  constructor(repository: CatalogRepository);
  listCatalog(filters: CatalogFilters): Promise<CatalogPage>;
  findMovie(movieId: number): Promise<import('@salateca/contracts').MovieDetailDto | null>;
  listMovieScreenings(movieId: number): Promise<import('@salateca/contracts').ScreeningDto[]>;
  listVenues(): Promise<import('@salateca/contracts').VenueDto[]>;
  listGenres(): Promise<import('@salateca/contracts').GenreDto[]>;
}
