import type { PostDetailDto, PostSummaryDto } from '@salateca/contracts';

export interface PostsRepository {
  listPosts(): Promise<PostSummaryDto[]>;
  findPost(postId: number): Promise<PostDetailDto | null>;
}
