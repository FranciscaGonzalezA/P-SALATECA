import type { ChileRegionCode } from '@salateca/contracts';
import type { AdminVenuesRepository } from './adminVenues.types.js';

export class AdminVenuesService {
  constructor(private readonly repository: AdminVenuesRepository) {}

  listPendingVenues() {
    return this.repository.listPendingVenues();
  }

  validateVenue(venueId: number, regionCode: ChileRegionCode) {
    return this.repository.validateVenue(venueId, regionCode);
  }
}
