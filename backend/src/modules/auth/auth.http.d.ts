import type { UserRole } from '@salateca/contracts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthService } from './auth.service.js';
export declare const sessionCookieName = 'salateca_session';
export declare function readSessionToken(request: Request): string | null;
export declare function sessionCookie(token: string, maxAgeSeconds: number): string;
export declare function clearSessionCookie(): string;
export declare function createAuthenticate(authService: AuthService): RequestHandler;
export declare function requireRole(role: UserRole): RequestHandler;
export declare function requireTrustedOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
): void;
