import { Router } from 'express';
import { z } from 'zod';
import { createAuthenticate, requireRole, requireTrustedOrigin } from '../auth/auth.http.js';
import { postIdSchema } from './posts.schemas.js';
const adminPostSchema = z.object({
  title: z.string().trim().min(3).max(500),
  body: z.string().trim().min(1).max(100_000),
  imageUrl: z.string().url().max(2048).nullable(),
  sourceName: z.string().trim().min(2).max(160),
  sourceUrl: z.string().url().max(2048),
  keywords: z.array(z.string().trim().min(1).max(80)).max(20),
});
const movePostSchema = z.object({
  direction: z.enum(['up', 'down']),
});
function parseId(value) {
  const parsed = postIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function invalidRequest(response) {
  response.status(400).json({
    error: { code: 'invalid_parameters', message: 'Revisa los datos de la publicación.' },
  });
}
export function createAdminPostsRouter(authService, postsService) {
  const router = Router();
  router.use('/admin', createAuthenticate(authService), requireRole('admin'));
  router.use('/admin', requireTrustedOrigin);
  router.post('/admin/posts', async (request, response) => {
    const parsed = adminPostSchema.safeParse(request.body);
    if (!parsed.success) return invalidRequest(response);
    const body = {
      data: await postsService.createPost(parsed.data),
    };
    response.status(201).json(body);
  });
  router.put('/admin/posts/:id', async (request, response) => {
    const postId = parseId(request.params.id);
    const parsed = adminPostSchema.safeParse(request.body);
    if (!postId || !parsed.success) return invalidRequest(response);
    const post = await postsService.updatePost(postId, parsed.data);
    if (!post) {
      response.status(404).json({
        error: { code: 'post_not_found', message: 'La publicación no existe.' },
      });
      return;
    }
    const body = { data: post };
    response.json(body);
  });
  router.patch('/admin/posts/:id/order', async (request, response) => {
    const postId = parseId(request.params.id);
    const parsed = movePostSchema.safeParse(request.body);
    if (!postId || !parsed.success) return invalidRequest(response);
    const moved = await postsService.movePost(postId, parsed.data.direction);
    if (moved === null) {
      response.status(404).json({
        error: { code: 'post_not_found', message: 'La publicación no existe.' },
      });
      return;
    }
    response.json({ data: { moved } });
  });
  router.delete('/admin/posts/:id', async (request, response) => {
    const postId = parseId(request.params.id);
    if (!postId) return invalidRequest(response);
    if (!(await postsService.deletePost(postId))) {
      response.status(404).json({
        error: { code: 'post_not_found', message: 'La publicación no existe.' },
      });
      return;
    }
    response.status(204).send();
  });
  return router;
}
