import { databasePool } from '../../db/pool.js';
export class MysqlAdminVenuesRepository {
  pool;
  constructor(pool = databasePool) {
    this.pool = pool;
  }
  async listPendingVenues() {
    const [rows] = await this.pool.execute(`
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
      `);
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
  async validateVenue(venueId, regionCode) {
    const [result] = await this.pool.execute(
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
