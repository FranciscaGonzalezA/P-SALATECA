import type {
  GenreDto,
  MovieDetailDto,
  MovieSummaryDto,
  ScreeningDto,
  VenueDto,
} from '@salateca/contracts';

export interface CatalogFilters {
  date?: string | undefined;
  time?: string | undefined;
  venue?: string | undefined;
  genre?: string | undefined;
  search?: string | undefined;
  sort?: 'upcoming' | 'featured' | undefined;
  page: number;
  pageSize: number;
}

export interface CatalogPage {
  items: MovieSummaryDto[];
  total: number;
}

export interface CatalogRepository {
  listCatalog(filters: CatalogFilters): Promise<CatalogPage>;
  findMovie(movieId: number): Promise<MovieDetailDto | null>;
  listMovieScreenings(movieId: number): Promise<ScreeningDto[]>;
  listVenues(): Promise<VenueDto[]>;
  listGenres(): Promise<GenreDto[]>;
}
