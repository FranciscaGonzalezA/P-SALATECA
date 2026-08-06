import type { ApiResponse, AuthenticatedUserDto } from '@salateca/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import {
  clearSessionCookie,
  createAuthenticate,
  readSessionToken,
  requireTrustedOrigin,
  sessionCookie,
} from './auth.http.js';
import { MysqlAuthRepository } from './mysqlAuthRepository.js';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.').max(256),
});

export function createAuthRouter(
  authService: AuthService = new AuthService(new MysqlAuthRepository()),
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authService);

  router.post('/auth/login', requireTrustedOrigin, async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'invalid_credentials',
          message: 'El correo o la contraseña no son válidos.',
        },
      });
      return;
    }

    const result = await authService.login(parsed.data.email, parsed.data.password);
    if (!result) {
      response.status(401).json({
        error: { code: 'invalid_credentials', message: 'Correo o contraseña incorrectos.' },
      });
      return;
    }

    const maxAgeSeconds = Math.max(0, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000));
    response.setHeader('Set-Cookie', sessionCookie(result.token, maxAgeSeconds));
    const body: ApiResponse<AuthenticatedUserDto> = { data: result.user };
    response.json(body);
  });

  router.get('/auth/me', authenticate, (_request, response) => {
    const body: ApiResponse<AuthenticatedUserDto> = { data: response.locals.authUser };
    response.json(body);
  });

  router.post('/auth/logout', requireTrustedOrigin, async (request, response) => {
    const token = readSessionToken(request);
    if (token) await authService.logout(token);
    response.setHeader('Set-Cookie', clearSessionCookie());
    response.status(204).send();
  });

  return router;
}
