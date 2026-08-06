import type { AdminPostInputDto, PostDetailDto, PostSummaryDto } from '@salateca/contracts';

export interface PostsRepository {
  listPosts(): Promise<PostSummaryDto[]>;
  findPost(postId: number): Promise<PostDetailDto | null>;
  createPost(input: AdminPostInputDto): Promise<PostDetailDto>;
  updatePost(postId: number, input: AdminPostInputDto): Promise<PostDetailDto | null>;
  deletePost(postId: number): Promise<boolean>;
}
