import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, hashSessionToken } from './auth.service.js';
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
});
