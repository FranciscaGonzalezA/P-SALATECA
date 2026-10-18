export class PostsService {
  repository;
  constructor(repository) {
    this.repository = repository;
  }
  listPosts() {
    return this.repository.listPosts();
  }
  findPost(postId) {
    return this.repository.findPost(postId);
  }
  createPost(input) {
    return this.repository.createPost(input);
  }
  updatePost(postId, input) {
    return this.repository.updatePost(postId, input);
  }
  movePost(postId, direction) {
    return this.repository.movePost(postId, direction);
  }
  deletePost(postId) {
    return this.repository.deletePost(postId);
  }
}
