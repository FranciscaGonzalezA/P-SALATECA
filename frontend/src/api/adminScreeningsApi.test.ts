import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminScreeningsApiError, uploadScreeningsExcel } from './adminScreeningsApi';

describe('adminScreeningsApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('envía el archivo XLSX y devuelve el resumen', async () => {
    const result = {
      runId: 9,
      status: 'succeeded',
      processed: 1,
      inserted: 1,
      updated: 0,
      rejected: 0,
      duplicates: 0,
      errors: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: result }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['excel'], 'cartelera.xlsx');

    await expect(uploadScreeningsExcel(file)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/screenings\/import$/),
      expect.objectContaining({ method: 'POST', body: file, credentials: 'include' }),
    );
  });

  it('propaga el mensaje de error de la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Falta la hoja Cartelera.' } }),
      }),
    );

    await expect(uploadScreeningsExcel(new File(['x'], 'error.xlsx'))).rejects.toEqual(
      expect.objectContaining<Partial<AdminScreeningsApiError>>({
        message: 'Falta la hoja Cartelera.',
        status: 400,
      }),
    );
  });
});
