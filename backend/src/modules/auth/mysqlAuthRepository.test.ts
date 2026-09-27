import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { MysqlAuthRepository } from './mysqlAuthRepository.js';

describe('MysqlAuthRepository', () => {
  it('reemplaza el token de recuperación anterior de una cuenta', async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const repository = new MysqlAuthRepository({ execute } as unknown as Pool);
    const expiresAt = new Date('2026-08-11T15:00:00.000Z');

    await repository.savePasswordResetToken('hash-token', 7, expiresAt);

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('ON DUPLICATE KEY UPDATE'), [
      'hash-token',
      7,
      expiresAt,
    ]);
  });

  it('actualiza la clave e invalida sesiones dentro de una transacción', async () => {
    const connection = {
      beginTransaction: vi.fn(),
      execute: vi
        .fn()
        .mockResolvedValueOnce([[{ user_id: 7 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 2 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    const repository = new MysqlAuthRepository({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as unknown as Pool);

    await expect(repository.consumePasswordResetToken('hash-token', 'hash-clave')).resolves.toBe(
      true,
    );
    expect(connection.execute.mock.calls[1]).toEqual([
      'UPDATE users SET password_hash = ? WHERE id = ?',
      ['hash-clave', 7],
    ]);
    expect(connection.execute.mock.calls[2]?.[0]).toContain('DELETE FROM user_sessions');
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('rechaza un token vencido o utilizado', async () => {
    const connection = {
      beginTransaction: vi.fn(),
      execute: vi.fn().mockResolvedValueOnce([[]]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    const repository = new MysqlAuthRepository({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as unknown as Pool);

    await expect(repository.consumePasswordResetToken('vencido', 'hash-clave')).resolves.toBe(
      false,
    );
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('elimina tokens fallidos y no sobrescribe la clave al sincronizar el admin', async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const repository = new MysqlAuthRepository({ execute } as unknown as Pool);

    await repository.deletePasswordResetToken('hash-token');
    await repository.upsertAdmin('admin@salateca.cl', 'hash-inicial');

    expect(execute.mock.calls[0]).toEqual([
      'DELETE FROM password_reset_tokens WHERE token_hash = ?',
      ['hash-token'],
    ]);
    expect(execute.mock.calls[1]?.[0]).not.toContain('password_hash = VALUES(password_hash)');
  });
});
