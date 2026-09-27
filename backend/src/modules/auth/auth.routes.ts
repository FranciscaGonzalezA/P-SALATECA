import type { ApiResponse, AuthenticatedUserDto } from '@salateca/contracts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
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
import type { PasswordResetMailer } from './auth.types.js';
import { ResendPasswordResetMailer } from './passwordResetMailer.js';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.').max(256),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(320),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(512),
    password: z.string().min(12).max(256),
    passwordConfirmation: z.string().min(12).max(256),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export function createAuthRouter(
  authService: AuthService = new AuthService(new MysqlAuthRepository()),
  passwordResetMailer: PasswordResetMailer = new ResendPasswordResetMailer(),
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authService);
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: {
        code: 'too_many_authentication_attempts',
        message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
      },
    },
  });
  const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'too_many_password_reset_attempts',
        message: 'Demasiadas solicitudes. Espera unos minutos antes de volver a intentarlo.',
      },
    },
  });

  router.post('/auth/login', loginLimiter, requireTrustedOrigin, async (request, response) => {
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

  router.post(
    '/auth/forgot-password',
    passwordResetLimiter,
    requireTrustedOrigin,
    async (request, response) => {
      const parsed = forgotPasswordSchema.safeParse(request.body);
      if (parsed.success) {
        const resetRequest = await authService.requestPasswordReset(parsed.data.email);
        if (resetRequest) {
          try {
            await passwordResetMailer.send(resetRequest);
          } catch (error) {
            await authService.deletePasswordResetToken(resetRequest.token);
            throw error;
          }
        }
      }

      response.status(202).json({
        data: {
          message:
            'Si existe una cuenta administradora con ese correo, recibirás un enlace de recuperación.',
        },
      });
    },
  );

  router.post(
    '/auth/reset-password',
    passwordResetLimiter,
    requireTrustedOrigin,
    async (request, response) => {
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          error: {
            code: 'invalid_password_reset',
            message: 'Revisa el enlace y usa una contraseña de al menos 12 caracteres.',
          },
        });
        return;
      }

      const reset = await authService.resetPassword(parsed.data.token, parsed.data.password);
      if (!reset) {
        response.status(400).json({
          error: {
            code: 'invalid_password_reset',
            message: 'El enlace de recuperación no es válido o ya venció.',
          },
        });
        return;
      }

      response.json({ data: { message: 'Tu contraseña fue actualizada.' } });
    },
  );

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
