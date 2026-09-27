import type {
  AdminPendingVenueDto,
  AdminVenueValidationDto,
  ChileRegionCode,
} from '@salateca/contracts';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databasePool } from '../../db/pool.js';
import type { AdminVenuesRepository } from './adminVenues.types.js';

interface PendingVenueRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  municipality: string | null;
  website_url: string | null;
  screening_count: number;
  upcoming_screening_count: number;
}

export class MysqlAdminVenuesRepository implements AdminVenuesRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async listPendingVenues(): Promise<AdminPendingVenueDto[]> {
    const [rows] = await this.pool.execute<PendingVenueRow[]>(
      `
        SELECT
          v.id,
          v.name,
          v.canonical_name AS slug,
          v.address,
          v.municipality,
          v.website_url,
          COUNT(s.id) AS screening_count,
          COALESCE(SUM(s.status = 'scheduled' AND s.starts_at >= UTC_TIMESTAMP()), 0)
            AS upcoming_screening_count
        FROM venues v
        LEFT JOIN screenings s ON s.venue_id = v.id
        WHERE v.region_code IS NULL OR TRIM(v.region_code) = ''
        GROUP BY
          v.id,
          v.name,
          v.canonical_name,
          v.address,
          v.municipality,
          v.website_url
        ORDER BY upcoming_screening_count DESC, screening_count DESC, v.name
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      municipality: row.municipality,
      websiteUrl: row.website_url,
      regionCode: null,
      screeningCount: Number(row.screening_count),
      upcomingScreeningCount: Number(row.upcoming_screening_count),
    }));
  }

  async validateVenue(
    venueId: number,
    regionCode: ChileRegionCode,
  ): Promise<AdminVenueValidationDto | null> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `
        UPDATE venues
        SET region_code = ?
        WHERE id = ? AND (region_code IS NULL OR TRIM(region_code) = '')
      `,
      [regionCode, venueId],
    );

    return result.affectedRows === 1 ? { id: venueId, regionCode } : null;
  }
}
