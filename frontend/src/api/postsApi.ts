import type {
  ApiErrorResponse,
  ApiResponse,
  PostDetailDto,
  PostSummaryDto,
} from '@salateca/contracts';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class PostsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PostsApiError';
  }
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new PostsApiError(
      body?.error.message ?? 'No fue posible consultar los posts.',
      response.status,
    );
  }

  return (await response.json()) as T;
}

export async function fetchPosts(signal?: AbortSignal): Promise<PostSummaryDto[]> {
  return (await request<ApiResponse<PostSummaryDto[]>>(`${apiBaseUrl}/posts`, signal)).data;
}

export async function fetchPost(postId: number, signal?: AbortSignal): Promise<PostDetailDto> {
  return (await request<ApiResponse<PostDetailDto>>(`${apiBaseUrl}/posts/${postId}`, signal)).data;
}
