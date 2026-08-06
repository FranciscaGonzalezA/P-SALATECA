import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPostsRouter } from './posts.routes.js';
import { PostsService } from './posts.service.js';
import type { PostsRepository } from './posts.types.js';

const post = {
  id: 1,
  title: 'Una mirada al cine chileno',
  body: 'Primer párrafo.\n\nSegundo párrafo.',
  imageUrl: 'https://example.com/post.jpg',
  keywords: ['cine chileno', 'memoria'],
  sourceName: 'Salateca de Cine',
  sourceUrl: 'https://salatecadecine.cl/post/',
  createdAt: '2026-08-06T12:00:00.000Z',
  updatedAt: '2026-08-06T12:00:00.000Z',
};

function createRepository(): PostsRepository {
  return {
    listPosts: vi.fn().mockResolvedValue([
      {
        id: post.id,
        title: post.title,
        imageUrl: post.imageUrl,
        keywords: post.keywords,
      },
    ]),
    findPost: vi.fn().mockResolvedValue(post),
    createPost: vi.fn().mockResolvedValue(post),
    updatePost: vi.fn().mockResolvedValue(post),
    deletePost: vi.fn().mockResolvedValue(true),
  };
}

describe('createPostsRouter', () => {
  let repository: PostsRepository;
  let app: express.Express;

  beforeEach(() => {
    repository = createRepository();
    app = express();
    app.use(createPostsRouter(new PostsService(repository)));
  });

  it('publica el listado y el detalle con el contrato común', async () => {
    const [list, detail] = await Promise.all([
      request(app).get('/posts'),
      request(app).get('/posts/1'),
    ]);

    expect(list.status).toBe(200);
    expect(list.body.data[0]).toMatchObject({ id: 1, title: post.title });
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual({ data: post });
    expect(repository.findPost).toHaveBeenCalledWith(1);
  });

  it('rechaza identificadores inválidos y distingue posts ausentes', async () => {
    const invalid = await request(app).get('/posts/no-numero');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatchObject({ code: 'invalid_parameters' });

    vi.mocked(repository.findPost).mockResolvedValueOnce(null);
    const missing = await request(app).get('/posts/999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('post_not_found');
  });
});
