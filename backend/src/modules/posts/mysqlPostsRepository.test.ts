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
    expect(execute.mock.calls[0]?.[0]).toContain('ORDER BY p.display_order, p.id');
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

  it('intercambia el orden de un post con su vecino', async () => {
    const connection = {
      beginTransaction: vi.fn(),
      execute: vi
        .fn()
        .mockResolvedValueOnce([[{ id: 2, display_order: 20 }]])
        .mockResolvedValueOnce([[{ id: 1, display_order: 10 }]])
        .mockResolvedValueOnce([{ affectedRows: 2 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    const moveRepository = new MysqlPostsRepository({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as unknown as Pool);

    await expect(moveRepository.movePost(2, 'up')).resolves.toBe(true);
    expect(connection.execute.mock.calls[1]?.[0]).toContain('display_order < ?');
    expect(connection.execute.mock.calls[2]?.[1]).toEqual([2, 10, 1, 20, 2, 1]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('informa cuando el post está en un extremo o no existe', async () => {
    const boundaryConnection = {
      beginTransaction: vi.fn(),
      execute: vi
        .fn()
        .mockResolvedValueOnce([[{ id: 1, display_order: 10 }]])
        .mockResolvedValueOnce([[]]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    const missingConnection = {
      beginTransaction: vi.fn(),
      execute: vi.fn().mockResolvedValueOnce([[]]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi
        .fn()
        .mockResolvedValueOnce(boundaryConnection)
        .mockResolvedValueOnce(missingConnection),
    };
    const moveRepository = new MysqlPostsRepository(pool as unknown as Pool);

    await expect(moveRepository.movePost(1, 'up')).resolves.toBe(false);
    await expect(moveRepository.movePost(999, 'down')).resolves.toBeNull();
    expect(boundaryConnection.commit).toHaveBeenCalledOnce();
    expect(missingConnection.rollback).toHaveBeenCalledOnce();
  });
});
