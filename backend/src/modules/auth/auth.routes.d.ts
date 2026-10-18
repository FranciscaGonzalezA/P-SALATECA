import { Router } from 'express';
import { AuthService } from './auth.service.js';
import type { PasswordResetMailer } from './auth.types.js';
export declare function createAuthRouter(
  authService?: AuthService,
  passwordResetMailer?: PasswordResetMailer,
): Router;
