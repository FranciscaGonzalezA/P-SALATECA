import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdminPostsApiError,
  createAdminPost,
  deleteAdminPost,
  moveAdminPost,
  updateAdminPost,
} from './adminPostsApi';

const input = {
  title: 'Post',
  body: 'Contenido',
  imageUrl: null,
  sourceName: 'Salateca',
  sourceUrl: 'https://example.com/post',
  keywords: ['cine'],
};
const post = { ...input, id: 4, createdAt: '', updatedAt: '' };

afterEach(() => vi.unstubAllGlobals());

describe('cliente administrativo de posts', () => {
  it('crea, actualiza, reordena y elimina usando la cookie de sesión', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: post }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: post }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { moved: true } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAdminPost(input)).resolves.toEqual(post);
    await expect(updateAdminPost(4, input)).resolves.toEqual(post);
    await expect(moveAdminPost(4, 'up')).resolves.toBe(true);
    await expect(deleteAdminPost(4)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/admin/posts/4');
    expect(fetchMock.mock.calls[2]).toMatchObject([
      expect.stringContaining('/admin/posts/4/order'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ direction: 'up' }) }),
    ]);
    expect(fetchMock.mock.calls.every(([, options]) => options.credentials === 'include')).toBe(
      true,
    );
  });

  it('expone errores de escritura y eliminación', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Sin permisos' } }), { status: 403 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Sin permisos' } }), { status: 403 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await expect(createAdminPost(input)).rejects.toMatchObject({
      message: 'Sin permisos',
      status: 403,
    });
    await expect(deleteAdminPost(4)).rejects.toMatchObject({
      message: 'Sin permisos',
      status: 403,
    });
    expect(new AdminPostsApiError('Error', 500)).toBeInstanceOf(Error);
  });
});
