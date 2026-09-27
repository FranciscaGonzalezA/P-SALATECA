import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service.js';
import type { AuthRepository } from '../auth/auth.types.js';
import { createAdminVenuesRouter } from './adminVenues.routes.js';
import { AdminVenuesService } from './adminVenues.service.js';
import type { AdminVenuesRepository } from './adminVenues.types.js';

const pendingVenue = {
  id: 12,
  name: 'Sala sin región',
  slug: 'sala-sin-region',
  address: 'Av. Cine 123',
  municipality: 'Santiago',
  websiteUrl: 'https://example.com',
  regionCode: null,
  screeningCount: 8,
  upcomingScreeningCount: 3,
};

describe('rutas administrativas de salas', () => {
  let authRepository: AuthRepository;
  let venuesRepository: AdminVenuesRepository;
  let app: express.Express;

  beforeEach(() => {
    authRepository = {
      findUserByEmail: vi.fn(),
      findUserBySession: vi
        .fn()
        .mockResolvedValue({ id: 1, email: 'admin@salateca.cl', role: 'admin' }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      savePasswordResetToken: vi.fn(),
      consumePasswordResetToken: vi.fn(),
      deletePasswordResetToken: vi.fn(),
      upsertAdmin: vi.fn(),
    };
    venuesRepository = {
      listPendingVenues: vi.fn().mockResolvedValue([pendingVenue]),
      validateVenue: vi.fn().mockResolvedValue({ id: 12, regionCode: 'CL-RM' }),
    };
    app = express();
    app.use(express.json());
    app.use(
      createAdminVenuesRouter(
        new AuthService(authRepository),
        new AdminVenuesService(venuesRepository),
      ),
    );
  });

  it('lista las salas sin región para el administrador', async () => {
    const response = await request(app)
      .get('/admin/venues/pending')
      .set('Cookie', 'salateca_session=token');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([pendingVenue]);
  });

  it('asigna manualmente una región válida', async () => {
    const response = await request(app)
      .patch('/admin/venues/12/region')
      .set('Cookie', 'salateca_session=token')
      .send({ regionCode: 'CL-RM' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id: 12, regionCode: 'CL-RM' });
    expect(venuesRepository.validateVenue).toHaveBeenCalledWith(12, 'CL-RM');
  });

  it('protege el flujo y rechaza regiones desconocidas', async () => {
    expect((await request(app).get('/admin/venues/pending')).status).toBe(401);

    const invalid = await request(app)
      .patch('/admin/venues/12/region')
      .set('Cookie', 'salateca_session=token')
      .send({ regionCode: 'CL-XX' });
    expect(invalid.status).toBe(400);

    const external = await request(app)
      .patch('/admin/venues/12/region')
      .set('Cookie', 'salateca_session=token')
      .set('Origin', 'https://attacker.example')
      .send({ regionCode: 'CL-RM' });
    expect(external.status).toBe(403);
  });

  it('evita sobrescribir una sala ya validada', async () => {
    vi.mocked(venuesRepository.validateVenue).mockResolvedValueOnce(null);
    const response = await request(app)
      .patch('/admin/venues/12/region')
      .set('Cookie', 'salateca_session=token')
      .send({ regionCode: 'CL-VS' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('venue_already_validated');
  });
});
