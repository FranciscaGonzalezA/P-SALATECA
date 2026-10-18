import { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import { AdminMovieMetadataService } from './adminMovieMetadata.service.js';
export declare function createAdminMovieMetadataRouter(
  authService: AuthService,
  service: AdminMovieMetadataService,
): Router;
