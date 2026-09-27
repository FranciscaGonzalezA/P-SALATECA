import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.js';
import { ResendPasswordResetMailer } from './passwordResetMailer.js';

const resetRequest = {
  email: 'admin@salateca.cl',
  token: 'token-seguro',
  expiresAt: new Date('2026-08-11T15:00:00.000Z'),
};

describe('ResendPasswordResetMailer', () => {
  const originalApiKey = env.RESEND_API_KEY;
  const originalFromEmail = env.PASSWORD_RESET_FROM_EMAIL;

  beforeEach(() => {
    env.RESEND_API_KEY = undefined;
    env.PASSWORD_RESET_FROM_EMAIL = undefined;
  });

  afterEach(() => {
    env.RESEND_API_KEY = originalApiKey;
    env.PASSWORD_RESET_FROM_EMAIL = originalFromEmail;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el enlace en consola durante el desarrollo sin proveedor', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await new ResendPasswordResetMailer().send(resetRequest);

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('/admin/restablecer?token=token-seguro'),
    );
  });

  it('envía el enlace con la API configurada', async () => {
    env.RESEND_API_KEY = 're_prueba';
    env.PASSWORD_RESET_FROM_EMAIL = 'Salateca <acceso@salateca.cl>';
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await new ResendPasswordResetMailer().send(resetRequest);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_prueba' }),
      }),
    );
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      from: 'Salateca <acceso@salateca.cl>',
      to: ['admin@salateca.cl'],
    });
    expect(payload.html).toContain('token-seguro');
  });

  it('informa cuando el proveedor rechaza el mensaje', async () => {
    env.RESEND_API_KEY = 're_prueba';
    env.PASSWORD_RESET_FROM_EMAIL = 'Salateca <acceso@salateca.cl>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 422 })));

    await expect(new ResendPasswordResetMailer().send(resetRequest)).rejects.toThrow('(422)');
  });
});
