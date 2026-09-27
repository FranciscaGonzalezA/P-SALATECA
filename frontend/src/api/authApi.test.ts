import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthApiError,
  fetchCurrentUser,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
} from './authApi';

const user = { id: 1, email: 'admin@salateca.cl', role: 'admin' as const };

afterEach(() => vi.unstubAllGlobals());

describe('cliente de autenticación', () => {
  it('inicia, consulta y cierra una sesión incluyendo credenciales', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: user }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: user }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(login(user.email, 'clave-segura')).resolves.toEqual(user);
    await expect(fetchCurrentUser()).resolves.toEqual(user);
    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.every(([, options]) => options.credentials === 'include')).toBe(
      true,
    );
  });

  it('interpreta 401 como ausencia de sesión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it('propaga el mensaje de error de la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Credenciales incorrectas' } }), {
          status: 401,
        }),
      ),
    );
    await expect(login(user.email, 'mala')).rejects.toMatchObject({
      name: 'AuthApiError',
      message: 'Credenciales incorrectas',
      status: 401,
    });
    expect(new AuthApiError('Error', 500)).toBeInstanceOf(Error);
  });

  it('solicita y completa la recuperación de contraseña', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { message: 'Revisa tu correo.' } }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { message: 'Contraseña actualizada.' } }), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestPasswordReset(user.email)).resolves.toBe('Revisa tu correo.');
    await expect(
      resetPassword('token-seguro', 'nueva-clave-segura', 'nueva-clave-segura'),
    ).resolves.toBe('Contraseña actualizada.');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      token: 'token-seguro',
      password: 'nueva-clave-segura',
      passwordConfirmation: 'nueva-clave-segura',
    });
  });
});
