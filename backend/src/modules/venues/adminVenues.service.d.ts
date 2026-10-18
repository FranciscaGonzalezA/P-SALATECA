import type { ChileRegionCode } from '@salateca/contracts';
import type { AdminVenuesRepository } from './adminVenues.types.js';
export declare class AdminVenuesService {
  private readonly repository;
  constructor(repository: AdminVenuesRepository);
  listPendingVenues(): Promise<import('@salateca/contracts').AdminPendingVenueDto[]>;
  validateVenue(
    venueId: number,
    regionCode: ChileRegionCode,
  ): Promise<import('@salateca/contracts').AdminVenueValidationDto | null>;
}
