import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { MysqlAdminVenuesRepository } from './mysqlAdminVenuesRepository.js';

describe('MysqlAdminVenuesRepository', () => {
  it('lista únicamente salas sin código y convierte sus contadores', async () => {
    const execute = vi.fn().mockResolvedValueOnce([
      [
        {
          id: 7,
          name: 'Sala nueva',
          slug: 'sala-nueva',
          address: null,
          municipality: null,
          website_url: null,
          screening_count: '4',
          upcoming_screening_count: '2',
        },
      ],
    ]);
    const repository = new MysqlAdminVenuesRepository({ execute } as unknown as Pool);

    await expect(repository.listPendingVenues()).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        regionCode: null,
        screeningCount: 4,
        upcomingScreeningCount: 2,
      }),
    ]);
    expect(execute.mock.calls[0]?.[0]).toContain('v.region_code IS NULL');
  });

  it('valida solo si la sala continúa pendiente', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const repository = new MysqlAdminVenuesRepository({ execute } as unknown as Pool);

    await expect(repository.validateVenue(7, 'CL-RM')).resolves.toEqual({
      id: 7,
      regionCode: 'CL-RM',
    });
    await expect(repository.validateVenue(7, 'CL-VS')).resolves.toBeNull();
    expect(execute.mock.calls[0]).toEqual([
      expect.stringContaining('region_code IS NULL'),
      ['CL-RM', 7],
    ]);
  });
});
