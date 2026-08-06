export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    elapsedMs: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]> | undefined;
  };
}

export interface GenreDto {
  id: number;
  name: string;
  slug: string;
}

export interface VenueDto {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  municipality: string | null;
  websiteUrl: string | null;
}

export interface SourceDto {
  id: number;
  name: string;
  type: 'website' | 'calendar' | 'social_media' | 'manual' | 'api';
  url: string;
  lastSuccessfulSyncAt: string | null;
}

export interface ScreeningDto {
  id: number;
  date: string;
  time: string;
  startsAt: string;
  language: string | null;
  format: string | null;
  officialUrl: string;
  capturedAt: string;
  venue: VenueDto;
  source: SourceDto;
}

export interface MovieSummaryDto {
  id: number;
  title: string;
  originalTitle: string | null;
  releaseYear: number | null;
  durationMinutes: number | null;
  director: string | null;
  synopsis: string | null;
  posterUrl: string | null;
  genres: GenreDto[];
  screenings: ScreeningDto[];
}

export interface MovieDetailDto extends MovieSummaryDto {
  updatedAt: string;
}

export interface PostSummaryDto {
  id: number;
  title: string;
  imageUrl: string | null;
  keywords: string[];
}

export interface PostDetailDto extends PostSummaryDto {
  body: string;
  sourceName: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'user' | 'admin';

export interface AuthenticatedUserDto {
  id: number;
  email: string;
  role: UserRole;
}

export interface AdminPostInputDto {
  title: string;
  body: string;
  imageUrl: string | null;
  sourceName: string;
  sourceUrl: string;
  keywords: string[];
}
