import type { PostsRepository } from './posts.types.js';
import type { AdminPostInputDto } from '@salateca/contracts';
export declare class PostsService {
  private readonly repository;
  constructor(repository: PostsRepository);
  listPosts(): Promise<import('@salateca/contracts').PostSummaryDto[]>;
  findPost(postId: number): Promise<import('@salateca/contracts').PostDetailDto | null>;
  createPost(input: AdminPostInputDto): Promise<import('@salateca/contracts').PostDetailDto>;
  updatePost(
    postId: number,
    input: AdminPostInputDto,
  ): Promise<import('@salateca/contracts').PostDetailDto | null>;
  movePost(postId: number, direction: 'up' | 'down'): Promise<boolean | null>;
  deletePost(postId: number): Promise<boolean>;
}
