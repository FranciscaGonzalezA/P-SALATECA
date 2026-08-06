import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('createApp', () => {
  it('expone metadatos de versión y oculta la tecnología', async () => {
    const response = await request(createApp()).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'Cine Arte API', version: 'v1' });
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });

  it('responde errores 404 con un contrato estable', async () => {
    const response = await request(createApp()).get('/no-existe');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('resource_not_found');
  });

  it('distingue JSON malformado de un fallo interno', async () => {
    const response = await request(createApp())
      .post('/api/v1/no-existe')
      .set('Content-Type', 'application/json')
      .send('{"incompleto":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_json');
  });
});
