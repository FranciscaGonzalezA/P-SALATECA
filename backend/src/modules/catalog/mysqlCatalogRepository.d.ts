import type { GenreDto, MovieDetailDto, ScreeningDto, VenueDto } from '@salateca/contracts';
import type { Pool } from 'mysql2/promise';
import type { CatalogFilters, CatalogPage, CatalogRepository } from './catalog.types.js';
export declare class MysqlCatalogRepository implements CatalogRepository {
  private readonly pool;
  constructor(pool?: Pool);
  listCatalog(filters: CatalogFilters): Promise<CatalogPage>;
  findMovie(movieId: number): Promise<MovieDetailDto | null>;
  listMovieScreenings(movieId: number): Promise<ScreeningDto[]>;
  listVenues(): Promise<VenueDto[]>;
  listGenres(): Promise<GenreDto[]>;
}
