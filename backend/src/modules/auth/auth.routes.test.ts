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
      upsertAdmin: vi.fn(),
    };
    app = express();
    app.use(express.json());
    app.use(createAuthRouter(new AuthService(repository, 8)));
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

    const me = await request(app).get('/auth/me');
    expect(me.status).toBe(401);
  });

  it('bloquea un origen externo antes de procesar credenciales', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'admin@salateca.cl', password: 'clave-administrador' });
    expect(response.status).toBe(403);
    expect(repository.findUserByEmail).not.toHaveBeenCalled();
  });
});
