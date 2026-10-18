import { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import { AdminVenuesService } from './adminVenues.service.js';
export declare function createAdminVenuesRouter(
  authService: AuthService,
  venuesService: AdminVenuesService,
): Router;
