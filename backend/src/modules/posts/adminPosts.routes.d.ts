import { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import { PostsService } from './posts.service.js';
export declare function createAdminPostsRouter(
  authService: AuthService,
  postsService: PostsService,
): Router;
