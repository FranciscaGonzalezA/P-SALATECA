import type { AdminPostInputDto, PostDetailDto, PostSummaryDto } from '@salateca/contracts';
import type { Pool } from 'mysql2/promise';
import type { PostsRepository } from './posts.types.js';
export declare class MysqlPostsRepository implements PostsRepository {
  private readonly pool;
  constructor(pool?: Pool);
  listPosts(): Promise<PostSummaryDto[]>;
  findPost(postId: number): Promise<PostDetailDto | null>;
  private resolveSourceId;
  createPost(input: AdminPostInputDto): Promise<PostDetailDto>;
  updatePost(postId: number, input: AdminPostInputDto): Promise<PostDetailDto | null>;
  movePost(postId: number, direction: 'up' | 'down'): Promise<boolean | null>;
  deletePost(postId: number): Promise<boolean>;
}
