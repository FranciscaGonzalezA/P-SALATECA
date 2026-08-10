import type {
  AdminPendingVenueDto,
  AdminVenueValidationDto,
  ApiErrorResponse,
  ApiResponse,
  ChileRegionCode,
} from '@salateca/contracts';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class AdminVenuesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminVenuesApiError';
  }
}

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new AdminVenuesApiError(body?.error.message ?? fallback, response.status);
  }
  return ((await response.json()) as ApiResponse<T>).data;
}

export async function fetchPendingVenues(): Promise<AdminPendingVenueDto[]> {
  const response = await fetch(`${apiBaseUrl}/admin/venues/pending`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return readResponse(response, 'No fue posible cargar las salas pendientes.');
}

export async function validateVenueRegion(
  venueId: number,
  regionCode: ChileRegionCode,
): Promise<AdminVenueValidationDto> {
  const response = await fetch(`${apiBaseUrl}/admin/venues/${venueId}/region`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ regionCode }),
  });
  return readResponse(response, 'No fue posible validar la sala.');
}
