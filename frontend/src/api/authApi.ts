import type { ApiErrorResponse, ApiResponse, AuthenticatedUserDto } from '@salateca/contracts';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function parseError(response: Response): Promise<AuthApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  return new AuthApiError(
    body?.error.message ?? 'No fue posible autenticar la sesión.',
    response.status,
  );
}

export async function login(email: string, password: string): Promise<AuthenticatedUserDto> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as ApiResponse<AuthenticatedUserDto>).data;
}

export async function fetchCurrentUser(): Promise<AuthenticatedUserDto | null> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401) return null;
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as ApiResponse<AuthenticatedUserDto>).data;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok && response.status !== 204) throw await parseError(response);
}
