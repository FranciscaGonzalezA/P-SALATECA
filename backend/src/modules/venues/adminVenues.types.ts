import type {
  AdminPendingVenueDto,
  AdminVenueValidationDto,
  ChileRegionCode,
} from '@salateca/contracts';

export interface AdminVenuesRepository {
  listPendingVenues(): Promise<AdminPendingVenueDto[]>;
  validateVenue(
    venueId: number,
    regionCode: ChileRegionCode,
  ): Promise<AdminVenueValidationDto | null>;
}
