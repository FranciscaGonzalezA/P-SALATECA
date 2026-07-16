export type SourceType = 'website' | 'calendar' | 'social_media' | 'manual' | 'api';

export interface RawScreening {
  movieTitle: string;
  venueName: string;
  startsAt: string;
  sourceUrl: string;
  sourceType: SourceType;
  language?: string | undefined;
  format?: string | undefined;
}

export interface NormalizedScreening extends RawScreening {
  movieKey: string;
  venueKey: string;
  capturedAt: string;
}
