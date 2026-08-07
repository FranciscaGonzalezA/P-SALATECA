import type { PostsRepository } from './posts.types.js';
import type { AdminPostInputDto } from '@salateca/contracts';

export class PostsService {
  constructor(private readonly repository: PostsRepository) {}

  listPosts() {
    return this.repository.listPosts();
  }

  findPost(postId: number) {
    return this.repository.findPost(postId);
  }

  createPost(input: AdminPostInputDto) {
    return this.repository.createPost(input);
  }

  updatePost(postId: number, input: AdminPostInputDto) {
    return this.repository.updatePost(postId, input);
  }

  movePost(postId: number, direction: 'up' | 'down') {
    return this.repository.movePost(postId, direction);
  }

  deletePost(postId: number) {
    return this.repository.deletePost(postId);
  }
}
