import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { IngestionRepository, IngestionTransaction } from './ingestion.types.js';
import { createScraperIngestionRouter } from './scraperIngestion.routes.js';

const token = 'test-scraper-token-with-at-least-32-characters';

function repository(): IngestionRepository {
  const transaction: IngestionTransaction = {
    async upsertSource() {
      return 1;
    },
    async createRun() {
      return 10;
    },
    async stageRecord() {
      return 20;
    },
    async recordErrors() {},
    async publishScreening() {
      return 'inserted';
    },
    async markStaging() {},
    async runInSavepoint(_name, operation) {
      return operation();
    },
    async finishRun() {},
  };
  return {
    async withTransaction(operation) {
      return operation(transaction);
    },
  };
}

function app(ingestToken: string | undefined) {
  const application = express();
  application.use(express.json());
  application.use('/api/v1', createScraperIngestionRouter(repository(), ingestToken));
  return application;
}

const normalizedPayload = {
  movieTitle: 'la casa lobo',
  venueName: 'Cine Arte Normandie',
  movieKey: 'la-casa-lobo',
  venueKey: 'cine-arte-normandie',
  screeningDate: '2026-08-12',
  screeningTime: '19:30',
  startsAt: '2026-08-12T23:30:00.000Z',
  sourceTimezone: 'America/Santiago',
  sourceUrl: 'https://normandie.cl/cartelera/',
  sourceType: 'website',
  capturedAt: '2026-08-10T12:00:00.000Z',
  duplicateKey: 'la-casa-lobo:cine-arte-normandie:2026-08-12T23:30:00.000Z',
};

describe('createScraperIngestionRouter', () => {
  it('rechaza credenciales ausentes o incorrectas', async () => {
    expect(
      (await request(app(token)).post('/api/v1/internal/scraper/ingest').send({})).status,
    ).toBe(401);
    expect(
      (
        await request(app(token))
          .post('/api/v1/internal/scraper/ingest')
          .set('Authorization', 'Bearer incorrecto')
          .send({})
      ).status,
    ).toBe(401);
  });

  it('permanece deshabilitado cuando no existe secreto', async () => {
    const response = await request(app(undefined)).post('/api/v1/internal/scraper/ingest').send({});
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('scraper_ingestion_disabled');
  });

  it('publica un lote normalizado mediante staging', async () => {
    const response = await request(app(token))
      .post('/api/v1/internal/scraper/ingest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: { name: 'Normandie', type: 'website', baseUrl: 'https://normandie.cl/cartelera/' },
        records: [{ rawPayload: normalizedPayload, normalizedPayload, rowNumber: 1 }],
      });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      runId: 10,
      status: 'succeeded',
      processed: 1,
      inserted: 1,
    });
  });
});
