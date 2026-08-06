import type { UserRole } from '@salateca/contracts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../../config/env.js';
import type { AuthService } from './auth.service.js';

export const sessionCookieName = 'salateca_session';

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === sessionCookieName) {
      const token = decodeURIComponent(part.slice(separator + 1).trim());
      return token.length <= 512 ? token : null;
    }
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function createAuthenticate(authService: AuthService): RequestHandler {
  return async (request, response, next) => {
    const token = readSessionToken(request);
    const user = token ? await authService.findUserByToken(token) : null;
    if (!user) {
      response.status(401).json({
        error: { code: 'authentication_required', message: 'Debes iniciar sesión.' },
      });
      return;
    }
    response.locals.authUser = user;
    next();
  };
}

export function requireRole(role: UserRole): RequestHandler {
  return (_request, response, next) => {
    if (response.locals.authUser?.role !== role) {
      response.status(403).json({
        error: {
          code: 'insufficient_permissions',
          message: 'No tienes permisos para esta acción.',
        },
      });
      return;
    }
    next();
  };
}

export function requireTrustedOrigin(request: Request, response: Response, next: NextFunction) {
  const origin = request.get('origin');
  if (origin && origin !== env.FRONTEND_ORIGIN) {
    response.status(403).json({
      error: { code: 'untrusted_origin', message: 'El origen de la solicitud no está autorizado.' },
    });
    return;
  }
  next();
}
