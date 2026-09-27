import { env } from '../../config/env.js';
import type { PasswordResetMailer, PasswordResetRequest } from './auth.types.js';

const resetSubject = 'Restablece tu contraseña de Salateca';

export class ResendPasswordResetMailer implements PasswordResetMailer {
  async send(request: PasswordResetRequest): Promise<void> {
    const resetUrl = `${env.FRONTEND_ORIGIN}/admin/restablecer?token=${encodeURIComponent(request.token)}`;

    if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM_EMAIL) {
      if (env.NODE_ENV === 'production') {
        throw new Error('El correo de recuperación no está configurado.');
      }
      console.info(`[recuperación de contraseña] ${request.email}: ${resetUrl}`);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.PASSWORD_RESET_FROM_EMAIL,
          to: [request.email],
          subject: resetSubject,
          text: `Solicitaste restablecer tu contraseña de Salateca. Abre este enlace antes de ${request.expiresAt.toISOString()}: ${resetUrl}\n\nSi no hiciste esta solicitud, puedes ignorar este mensaje.`,
          html: `<p>Solicitaste restablecer tu contraseña de Salateca.</p><p><a href="${resetUrl}">Crear una nueva contraseña</a></p><p>El enlace vence en ${env.PASSWORD_RESET_TOKEN_MINUTES} minutos. Si no hiciste esta solicitud, puedes ignorar este mensaje.</p>`,
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend rechazó el correo de recuperación (${response.status}).`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
