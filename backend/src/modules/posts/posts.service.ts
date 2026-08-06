import type { PostsRepository } from './posts.types.js';

export class PostsService {
  constructor(private readonly repository: PostsRepository) {}

  listPosts() {
    return this.repository.listPosts();
  }

  findPost(postId: number) {
    return this.repository.findPost(postId);
  }
}
