import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, hashPasswordResetToken, hashSessionToken } from './auth.service.js';
import type { AuthRepository } from './auth.types.js';
import { hashPassword, verifyPassword } from './password.js';

describe('autenticación', () => {
  let repository: AuthRepository;

  beforeEach(() => {
    repository = {
      findUserByEmail: vi.fn(),
      findUserBySession: vi.fn(),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      savePasswordResetToken: vi.fn(),
      consumePasswordResetToken: vi.fn(),
      deletePasswordResetToken: vi.fn(),
      upsertAdmin: vi.fn(),
    };
  });

  it('genera hashes con sal y verifica la contraseña', async () => {
    const encoded = await hashPassword('contraseña-segura');
    expect(encoded).toMatch(/^scrypt:/);
    await expect(verifyPassword('contraseña-segura', encoded)).resolves.toBe(true);
    await expect(verifyPassword('incorrecta', encoded)).resolves.toBe(false);
    await expect(verifyPassword('cualquiera', 'inválido')).resolves.toBe(false);
  });

  it('crea una sesión opaca para credenciales válidas', async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValue({
      id: 7,
      email: 'admin@salateca.cl',
      role: 'admin',
      passwordHash: await hashPassword('clave-administrador'),
    });
    const service = new AuthService(repository, 8);
    const result = await service.login(' ADMIN@salateca.cl ', 'clave-administrador');

    expect(result?.user).toEqual({ id: 7, email: 'admin@salateca.cl', role: 'admin' });
    expect(result?.token).not.toContain('admin@salateca.cl');
    expect(repository.createSession).toHaveBeenCalledWith(
      hashSessionToken(result!.token),
      7,
      expect.any(Date),
    );
  });

  it('rechaza credenciales incorrectas y permite cerrar sesión', async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValue(null);
    const service = new AuthService(repository);
    await expect(service.login('nadie@example.com', 'incorrecta')).resolves.toBeNull();
    await service.logout('token');
    expect(repository.deleteSession).toHaveBeenCalledWith(hashSessionToken('token'));
  });

  it('genera y consume un token opaco de recuperación para administradores', async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValue({
      id: 7,
      email: 'admin@salateca.cl',
      role: 'admin',
      passwordHash: 'hash-anterior',
    });
    vi.mocked(repository.consumePasswordResetToken).mockResolvedValue(true);
    const service = new AuthService(repository, 8, 30);

    const resetRequest = await service.requestPasswordReset(' ADMIN@salateca.cl ');
    expect(resetRequest?.token).toHaveLength(43);
    expect(repository.savePasswordResetToken).toHaveBeenCalledWith(
      hashPasswordResetToken(resetRequest!.token),
      7,
      expect.any(Date),
    );

    await expect(service.resetPassword(resetRequest!.token, 'nueva-clave-segura')).resolves.toBe(
      true,
    );
    expect(repository.consumePasswordResetToken).toHaveBeenCalledWith(
      hashPasswordResetToken(resetRequest!.token),
      expect.stringMatching(/^scrypt:/),
    );
  });

  it('no genera recuperación para correos desconocidos ni cuentas no administradoras', async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 2,
      email: 'user@salateca.cl',
      role: 'user',
      passwordHash: 'hash',
    });
    const service = new AuthService(repository);

    await expect(service.requestPasswordReset('nadie@example.com')).resolves.toBeNull();
    await expect(service.requestPasswordReset('user@salateca.cl')).resolves.toBeNull();
    expect(repository.savePasswordResetToken).not.toHaveBeenCalled();
  });
});
