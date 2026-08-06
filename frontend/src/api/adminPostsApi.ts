import type {
  AdminPostInputDto,
  ApiErrorResponse,
  ApiResponse,
  PostDetailDto,
} from '@salateca/contracts';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class AdminPostsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminPostsApiError';
  }
}

async function mutatePost(
  method: 'POST' | 'PUT',
  path: string,
  input: AdminPostInputDto,
): Promise<PostDetailDto> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new AdminPostsApiError(
      body?.error.message ?? 'No fue posible guardar la publicación.',
      response.status,
    );
  }
  return ((await response.json()) as ApiResponse<PostDetailDto>).data;
}

export function createAdminPost(input: AdminPostInputDto): Promise<PostDetailDto> {
  return mutatePost('POST', '/admin/posts', input);
}

export function updateAdminPost(postId: number, input: AdminPostInputDto): Promise<PostDetailDto> {
  return mutatePost('PUT', `/admin/posts/${postId}`, input);
}

export async function deleteAdminPost(postId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/admin/posts/${postId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new AdminPostsApiError(
      body?.error.message ?? 'No fue posible eliminar la publicación.',
      response.status,
    );
  }
}
