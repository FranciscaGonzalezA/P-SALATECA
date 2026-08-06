import type { Pool } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MysqlPostsRepository } from './mysqlPostsRepository.js';

const row = {
  id: 1,
  title: 'Una mirada al cine chileno',
  body: 'Primer párrafo.\n\nSegundo párrafo.',
  image_url: 'https://example.com/post.jpg',
  source_url: 'https://salatecadecine.cl/post/',
  keywords: '["cine chileno","memoria"]',
  source_name: 'Salateca de Cine',
  created_at: '2026-08-06 12:00:00.000',
  updated_at: '2026-08-06 12:30:00.000',
};

describe('MysqlPostsRepository', () => {
  const execute = vi.fn();
  const repository = new MysqlPostsRepository({ execute } as unknown as Pool);

  beforeEach(() => execute.mockReset());

  it('lista posts y normaliza keywords entregadas como JSON', async () => {
    execute.mockResolvedValueOnce([[row, { ...row, id: 2, keywords: ['ensayo'] }]]);

    const posts = await repository.listPosts();

    expect(posts).toEqual([
      {
        id: 1,
        title: row.title,
        imageUrl: row.image_url,
        keywords: ['cine chileno', 'memoria'],
      },
      {
        id: 2,
        title: row.title,
        imageUrl: row.image_url,
        keywords: ['ensayo'],
      },
    ]);
    expect(execute.mock.calls[0]?.[0]).toContain('ORDER BY p.id');
  });

  it('mapea el detalle y consulta por identificador parametrizado', async () => {
    execute.mockResolvedValueOnce([[row]]);

    await expect(repository.findPost(1)).resolves.toMatchObject({
      id: 1,
      body: row.body,
      sourceName: 'Salateca de Cine',
      createdAt: '2026-08-06T12:00:00.000Z',
      updatedAt: '2026-08-06T12:30:00.000Z',
    });
    expect(execute.mock.calls[0]?.[1]).toEqual([1]);
  });

  it('responde null cuando el post no existe', async () => {
    execute.mockResolvedValueOnce([[]]);
    await expect(repository.findPost(404)).resolves.toBeNull();
  });
});
