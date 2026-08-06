import type { ApiErrorResponse, ApiResponse, ScreeningImportResultDto } from '@salateca/contracts';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class AdminScreeningsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminScreeningsApiError';
  }
}

export async function uploadScreeningsExcel(file: File): Promise<ScreeningImportResultDto> {
  const response = await fetch(`${apiBaseUrl}/admin/screenings/import`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': xlsxMimeType, Accept: 'application/json' },
    body: file,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new AdminScreeningsApiError(
      body?.error.message ?? 'No fue posible importar la cartelera.',
      response.status,
    );
  }
  return ((await response.json()) as ApiResponse<ScreeningImportResultDto>).data;
}
