import type {
  ApiErrorResponse,
  ApiResponse,
  PostDetailDto,
  PostSummaryDto,
} from '@salateca/contracts';
import { Router } from 'express';
import { postIdSchema } from './posts.schemas.js';
import { PostsService } from './posts.service.js';
import { MysqlPostsRepository } from './mysqlPostsRepository.js';

export function createPostsRouter(
  service: PostsService = new PostsService(new MysqlPostsRepository()),
): Router {
  const router = Router();

  router.get('/posts', async (_request, response) => {
    const body: ApiResponse<PostSummaryDto[]> = { data: await service.listPosts() };
    response.json(body);
  });

  router.get('/posts/:id', async (request, response) => {
    const parsedId = postIdSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      const body: ApiErrorResponse = {
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
      const body: ApiErrorResponse = {
        error: {
          code: 'post_not_found',
          message: 'El post solicitado no existe.',
        },
      };
      response.status(404).json(body);
      return;
    }

    const body: ApiResponse<PostDetailDto> = { data: post };
    response.json(body);
  });

  return router;
}
