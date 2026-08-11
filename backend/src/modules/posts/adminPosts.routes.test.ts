import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service.js';
import type { AuthRepository } from '../auth/auth.types.js';
import { createAdminPostsRouter } from './adminPosts.routes.js';
import { PostsService } from './posts.service.js';
import type { PostsRepository } from './posts.types.js';

const input = {
  title: 'Nueva publicación',
  body: 'Contenido editorial',
  imageUrl: null,
  sourceName: 'Salateca',
  sourceUrl: 'https://example.com/nueva-publicacion',
  keywords: ['cine'],
};
const post = {
  id: 10,
  ...input,
  createdAt: '2026-08-06T12:00:00.000Z',
  updatedAt: '2026-08-06T12:00:00.000Z',
};

describe('rutas administrativas de posts', () => {
  let authRepository: AuthRepository;
  let postsRepository: PostsRepository;
  let app: express.Express;

  beforeEach(() => {
    authRepository = {
      findUserByEmail: vi.fn(),
      findUserBySession: vi
        .fn()
        .mockResolvedValue({ id: 1, email: 'admin@salateca.cl', role: 'admin' }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      savePasswordResetToken: vi.fn(),
      consumePasswordResetToken: vi.fn(),
      deletePasswordResetToken: vi.fn(),
      upsertAdmin: vi.fn(),
    };
    postsRepository = {
      listPosts: vi.fn(),
      findPost: vi.fn(),
      createPost: vi.fn().mockResolvedValue(post),
      updatePost: vi.fn().mockResolvedValue(post),
      movePost: vi.fn().mockResolvedValue(true),
      deletePost: vi.fn().mockResolvedValue(true),
    };
    app = express();
    app.use(express.json());
    app.use(
      createAdminPostsRouter(new AuthService(authRepository), new PostsService(postsRepository)),
    );
  });

  it('exige sesión y rol administrador', async () => {
    const unauthenticated = await request(app).post('/admin/posts').send(input);
    expect(unauthenticated.status).toBe(401);

    vi.mocked(authRepository.findUserBySession).mockResolvedValueOnce({
      id: 2,
      email: 'user@salateca.cl',
      role: 'user',
    });
    const forbidden = await request(app)
      .post('/admin/posts')
      .set('Cookie', 'salateca_session=token')
      .send(input);
    expect(forbidden.status).toBe(403);
  });

  it('permite crear, actualizar, reordenar y eliminar posts al administrador', async () => {
    const create = await request(app)
      .post('/admin/posts')
      .set('Cookie', 'salateca_session=token')
      .send(input);
    expect(create.status).toBe(201);
    expect(create.body.data.id).toBe(10);

    const update = await request(app)
      .put('/admin/posts/10')
      .set('Cookie', 'salateca_session=token')
      .send(input);
    expect(update.status).toBe(200);

    const move = await request(app)
      .patch('/admin/posts/10/order')
      .set('Cookie', 'salateca_session=token')
      .send({ direction: 'up' });
    expect(move.status).toBe(200);
    expect(move.body).toEqual({ data: { moved: true } });
    expect(postsRepository.movePost).toHaveBeenCalledWith(10, 'up');

    const remove = await request(app)
      .delete('/admin/posts/10')
      .set('Cookie', 'salateca_session=token');
    expect(remove.status).toBe(204);
  });

  it('rechaza orígenes externos y entradas inválidas', async () => {
    const origin = await request(app)
      .post('/admin/posts')
      .set('Cookie', 'salateca_session=token')
      .set('Origin', 'https://attacker.example')
      .send(input);
    expect(origin.status).toBe(403);

    const invalid = await request(app)
      .post('/admin/posts')
      .set('Cookie', 'salateca_session=token')
      .send({ ...input, title: '' });
    expect(invalid.status).toBe(400);

    const invalidMove = await request(app)
      .patch('/admin/posts/10/order')
      .set('Cookie', 'salateca_session=token')
      .send({ direction: 'left' });
    expect(invalidMove.status).toBe(400);
  });

  it('distingue un post inexistente al reordenar', async () => {
    vi.mocked(postsRepository.movePost).mockResolvedValueOnce(null);
    const response = await request(app)
      .patch('/admin/posts/999/order')
      .set('Cookie', 'salateca_session=token')
      .send({ direction: 'down' });
    expect(response.status).toBe(404);
  });
});
