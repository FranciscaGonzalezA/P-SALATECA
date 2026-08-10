import type {
  ApiErrorResponse,
  ApiResponse,
  GenreDto,
  MovieDetailDto,
  MovieSummaryDto,
  PaginatedApiResponse,
  VenueDto,
} from '@salateca/contracts';
import { demoGenres, demoMovies, demoVenues, filterDemoMovies } from '../data/demoCatalog';
import { localDateValue } from '../utils/localDate';

export interface CatalogQuery {
  date?: string | undefined;
  time?: string | undefined;
  venue?: string | undefined;
  genre?: string | undefined;
  search?: string | undefined;
  sort?: 'upcoming' | 'featured' | undefined;
  page: number;
  pageSize: number;
}

export interface CatalogResult {
  items: MovieSummaryDto[];
  total: number;
  totalPages: number;
  elapsedMs: number;
  demo: boolean;
}

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const allowDemoFallback =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false');

export class CatalogApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CatalogApiError';
  }
}

export function buildCatalogUrl(query: CatalogQuery, baseUrl = apiBaseUrl): string {
  const url = new URL(`${baseUrl}/cartelera`);
  const parameters: Array<[string, string | number | undefined]> = [
    ['fecha', query.date],
    ['horario', query.time],
    ['sala', query.venue],
    ['genero', query.genre],
    ['buscar', query.search],
    ['orden', query.sort === 'featured' ? 'destacados' : undefined],
    ['pagina', query.page],
    ['limite', query.pageSize],
  ];

  for (const [key, value] of parameters) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new CatalogApiError(
      body?.error.message ?? 'No fue posible consultar la cartelera.',
      response.status,
    );
  }

  return (await response.json()) as T;
}

export async function fetchCatalog(
  query: CatalogQuery,
  signal?: AbortSignal,
): Promise<CatalogResult> {
  try {
    const response = await request<PaginatedApiResponse<MovieSummaryDto[]>>(
      buildCatalogUrl(query),
      signal,
    );
    return {
      items: response.data,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
      elapsedMs: response.meta.elapsedMs,
      demo: false,
    };
  } catch (error) {
    if (!allowDemoFallback || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }

    const demo = filterDemoMovies(query);
    return {
      items: demo.items,
      total: demo.total,
      totalPages: Math.ceil(demo.total / query.pageSize),
      elapsedMs: 0,
      demo: true,
    };
  }
}

export async function fetchMovie(
  movieId: number,
  signal?: AbortSignal,
): Promise<{
  movie: MovieDetailDto;
  demo: boolean;
}> {
  try {
    const response = await request<ApiResponse<MovieDetailDto>>(
      `${apiBaseUrl}/peliculas/${movieId}`,
      signal,
    );
    return { movie: response.data, demo: false };
  } catch (error) {
    const movie = demoMovies.find((item) => item.id === movieId);
    if (
      !allowDemoFallback ||
      !movie ||
      (error instanceof DOMException && error.name === 'AbortError')
    ) {
      throw error;
    }
    const today = localDateValue();
    return {
      movie: {
        ...movie,
        screenings: movie.screenings.filter((screening) => screening.date >= today),
      },
      demo: true,
    };
  }
}

export async function fetchVenues(signal?: AbortSignal): Promise<VenueDto[]> {
  try {
    return (await request<ApiResponse<VenueDto[]>>(`${apiBaseUrl}/salas`, signal)).data;
  } catch (error) {
    if (!allowDemoFallback || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }
    return demoVenues;
  }
}

export async function fetchGenres(signal?: AbortSignal): Promise<GenreDto[]> {
  try {
    return (await request<ApiResponse<GenreDto[]>>(`${apiBaseUrl}/generos`, signal)).data;
  } catch (error) {
    if (!allowDemoFallback || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }
    return demoGenres;
  }
}
