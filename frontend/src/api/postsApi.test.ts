import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPost, fetchPosts, PostsApiError } from './postsApi';

afterEach(() => vi.unstubAllGlobals());

describe('cliente de posts', () => {
  it('consume el listado y el detalle desde la API', async () => {
    const summary = { id: 1, title: 'Post', imageUrl: null, keywords: ['cine'] };
    const detail = { ...summary, body: 'Cuerpo del post' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [summary] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: detail }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPosts()).resolves.toEqual([summary]);
    await expect(fetchPost(1)).resolves.toEqual(detail);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/posts');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/posts/1');
  });

  it('expone el mensaje y estado de error entregado por la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'post_not_found', message: 'Post inexistente' } }),
            { status: 404 },
          ),
        ),
    );

    await expect(fetchPost(99)).rejects.toMatchObject({
      name: 'PostsApiError',
      message: 'Post inexistente',
      status: 404,
    });
    expect(new PostsApiError('Error', 500)).toBeInstanceOf(Error);
  });
});
