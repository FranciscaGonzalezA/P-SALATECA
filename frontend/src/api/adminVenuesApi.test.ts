import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminVenuesApiError, fetchPendingVenues, validateVenueRegion } from './adminVenuesApi';

afterEach(() => vi.unstubAllGlobals());

describe('cliente administrativo de salas', () => {
  it('lista pendientes y envía la validación con la sesión', async () => {
    const venues = [{ id: 3, name: 'Sala', regionCode: null }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: venues }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 3, regionCode: 'CL-RM' } }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPendingVenues()).resolves.toEqual(venues);
    await expect(validateVenueRegion(3, 'CL-RM')).resolves.toEqual({
      id: 3,
      regionCode: 'CL-RM',
    });
    expect(fetchMock.mock.calls[1]).toMatchObject([
      expect.stringContaining('/admin/venues/3/region'),
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ regionCode: 'CL-RM' }),
      }),
    ]);
  });

  it('expone el mensaje de error del servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: 'Sala ya validada' } }), { status: 409 }),
        ),
    );
    await expect(validateVenueRegion(3, 'CL-RM')).rejects.toMatchObject({
      message: 'Sala ya validada',
      status: 409,
    });
    expect(new AdminVenuesApiError('Error', 500)).toBeInstanceOf(Error);
  });
});
