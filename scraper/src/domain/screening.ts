export type SourceType = 'website' | 'calendar' | 'social_media' | 'manual' | 'api';

export interface RawScreening {
  movieTitle: string;
  venueName: string;
  startsAt?: string | undefined;
  screeningDate?: string | undefined;
  screeningTime?: string | undefined;
  sourceTimezone?: string | undefined;
  sourceUrl: string;
  sourceType: SourceType;
  sourceRecordKey?: string | undefined;
  capturedAt?: string | undefined;
  language?: string | undefined;
  format?: string | undefined;
}

export interface NormalizedScreening {
  movieTitle: string;
  venueName: string;
  movieKey: string;
  venueKey: string;
  screeningDate: string;
  screeningTime: string;
  startsAt: string;
  sourceTimezone: string;
  sourceUrl: string;
  sourceType: SourceType;
  sourceRecordKey?: string | undefined;
  capturedAt: string;
  language?: string | undefined;
  format?: string | undefined;
  duplicateKey: string;
}

export type NormalizationIssueCode =
  | 'duplicate'
  | 'invalid_date'
  | 'invalid_datetime'
  | 'invalid_format'
  | 'invalid_timezone'
  | 'required';

export interface NormalizationIssue {
  field: string;
  code: NormalizationIssueCode;
  message: string;
}

export interface RejectedScreening {
  input: unknown;
  capturedAt: string;
  issues: NormalizationIssue[];
}

export interface DuplicateScreening {
  input: unknown;
  capturedAt: string;
  duplicateKey: string;
}

export interface NormalizationBatchSummary {
  processed: number;
  normalized: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  successRate: number;
}

export interface NormalizationBatchResult {
  records: NormalizedScreening[];
  rejected: RejectedScreening[];
  duplicates: DuplicateScreening[];
  summary: NormalizationBatchSummary;
}
