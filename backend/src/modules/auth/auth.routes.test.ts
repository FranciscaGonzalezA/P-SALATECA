import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { createAuthRouter } from './auth.routes.js';
import type { AuthRepository } from './auth.types.js';
import { hashPassword } from './password.js';

describe('rutas de autenticación', () => {
  let repository: AuthRepository;
  let app: express.Express;

  beforeEach(async () => {
    repository = {
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 1,
        email: 'admin@salateca.cl',
        role: 'admin',
        passwordHash: await hashPassword('clave-administrador'),
      }),
      findUserBySession: vi.fn().mockResolvedValue({
        id: 1,
        email: 'admin@salateca.cl',
        role: 'admin',
      }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      savePasswordResetToken: vi.fn(),
      consumePasswordResetToken: vi.fn().mockResolvedValue(true),
      deletePasswordResetToken: vi.fn(),
      upsertAdmin: vi.fn(),
    };
    app = express();
    app.use(express.json());
    app.use(createAuthRouter(new AuthService(repository, 8), { send: vi.fn() }));
  });

  it('inicia sesión, publica la identidad y cierra la sesión', async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@salateca.cl', password: 'clave-administrador' });
    expect(login.status).toBe(200);
    expect(login.body.data.role).toBe('admin');
    expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const me = await request(app).get('/auth/me').set('Cookie', 'salateca_session=token-opaco');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('admin@salateca.cl');

    const logout = await request(app)
      .post('/auth/logout')
      .set('Cookie', 'salateca_session=token-opaco');
    expect(logout.status).toBe(204);
    expect(repository.deleteSession).toHaveBeenCalled();
    expect(logout.headers['set-cookie']?.[0]).toContain('Max-Age=0');
  });

  it('rechaza entradas inválidas, credenciales erróneas y sesiones ausentes', async () => {
    const invalid = await request(app).post('/auth/login').send({ email: 'correo-inválido' });
    expect(invalid.status).toBe(400);

    vi.mocked(repository.findUserByEmail).mockResolvedValueOnce(null);
    const denied = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@example.com', password: 'incorrecta' });
    expect(denied.status).toBe(401);
    expect((await request(app).get('/auth/me')).status).toBe(401);
  });

  it('bloquea un origen externo antes de procesar credenciales', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'admin@salateca.cl', password: 'clave-administrador' });
    expect(response.status).toBe(403);
    expect(repository.findUserByEmail).not.toHaveBeenCalled();
  });

  it('solicita y completa la recuperación sin revelar si el correo existe', async () => {
    const mailer = { send: vi.fn() };
    app = express();
    app.use(express.json());
    app.use(createAuthRouter(new AuthService(repository, 8, 30), mailer));

    const requested = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'admin@salateca.cl' });
    expect(requested.status).toBe(202);
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@salateca.cl', token: expect.any(String) }),
    );

    vi.mocked(repository.findUserByEmail).mockResolvedValueOnce(null);
    const unknown = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'nadie@example.com' });
    expect(unknown.status).toBe(202);

    const completed = await request(app)
      .post('/auth/reset-password')
      .send({
        token: 'a'.repeat(43),
        password: 'nueva-clave-segura',
        passwordConfirmation: 'nueva-clave-segura',
      });
    expect(completed.status).toBe(200);
    expect(repository.consumePasswordResetToken).toHaveBeenCalled();
  });

  it('rechaza enlaces vencidos y contraseñas inválidas', async () => {
    vi.mocked(repository.consumePasswordResetToken).mockResolvedValue(false);
    const token = 'b'.repeat(43);
    const mismatch = await request(app).post('/auth/reset-password').send({
      token,
      password: 'nueva-clave-segura',
      passwordConfirmation: 'distinta-clave-segura',
    });
    expect(mismatch.status).toBe(400);

    const expired = await request(app).post('/auth/reset-password').send({
      token,
      password: 'nueva-clave-segura',
      passwordConfirmation: 'nueva-clave-segura',
    });
    expect(expired.status).toBe(400);
    expect(expired.body.error.message).toContain('venció');
  });
});
