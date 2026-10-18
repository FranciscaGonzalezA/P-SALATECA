import type {
  AdminPendingVenueDto,
  AdminVenueValidationDto,
  ChileRegionCode,
} from '@salateca/contracts';
import type { Pool } from 'mysql2/promise';
import type { AdminVenuesRepository } from './adminVenues.types.js';
export declare class MysqlAdminVenuesRepository implements AdminVenuesRepository {
  private readonly pool;
  constructor(pool?: Pool);
  listPendingVenues(): Promise<AdminPendingVenueDto[]>;
  validateVenue(
    venueId: number,
    regionCode: ChileRegionCode,
  ): Promise<AdminVenueValidationDto | null>;
}
