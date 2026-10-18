import { Router } from 'express';
import { postIdSchema } from './posts.schemas.js';
import { PostsService } from './posts.service.js';
import { MysqlPostsRepository } from './mysqlPostsRepository.js';
export function createPostsRouter(service = new PostsService(new MysqlPostsRepository())) {
  const router = Router();
  router.get('/posts', async (_request, response) => {
    const body = { data: await service.listPosts() };
    response.json(body);
  });
  router.get('/posts/:id', async (request, response) => {
    const parsedId = postIdSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      const body = {
        error: {
          code: 'invalid_parameters',
          message: 'El identificador del post no es válido.',
          fields: { id: ['Debe ser un número entero positivo.'] },
        },
      };
      response.status(400).json(body);
      return;
    }
    const post = await service.findPost(parsedId.data);
    if (!post) {
      const body = {
        error: {
          code: 'post_not_found',
          message: 'El post solicitado no existe.',
        },
      };
      response.status(404).json(body);
      return;
    }
    const body = { data: post };
    response.json(body);
  });
  return router;
}
