import ExcelJS from 'exceljs';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service.js';
import type { AuthRepository } from '../auth/auth.types.js';
import { createAdminIngestionRouter } from './adminIngestion.routes.js';
import type { IngestionRepository, IngestionTransaction } from './ingestion.types.js';
import type { MovieMetadataEnricher } from '../metadata/metadata.types.js';

const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

class MemoryRepository implements IngestionRepository {
  async withTransaction<T>(operation: (transaction: IngestionTransaction) => Promise<T>) {
    const transaction: IngestionTransaction = {
      upsertSource: async () => 1,
      createRun: async () => 44,
      stageRecord: async () => 1,
      recordErrors: async () => undefined,
      publishScreening: async () => 'inserted',
      markStaging: async () => undefined,
      runInSavepoint: async <R>(_name: string, callback: () => Promise<R>) => callback(),
      finishRun: async () => undefined,
    };
    return operation(transaction);
  }
}

async function validWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Cartelera');
  sheet.addRow(['Fecha parseada', 'Fecha texto', 'Pelicula', 'Sala', 'URL']);
  sheet.addRow([
    '2026-06-30 19:00:00',
    '',
    'La casa lobo',
    'Cineteca Nacional',
    'https://example.com/funcion',
  ]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('ruta administrativa de importación Excel', () => {
  let authRepository: AuthRepository;
  let app: express.Express;
  let metadataEnricher: MovieMetadataEnricher;

  beforeEach(() => {
    authRepository = {
      findUserByEmail: vi.fn(),
      findUserBySession: vi
        .fn()
        .mockResolvedValue({ id: 1, email: 'admin@salateca.cl', role: 'admin' }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      upsertAdmin: vi.fn(),
    };
    metadataEnricher = {
      enrichMovies: vi.fn().mockResolvedValue({
        provider: 'tmdb',
        requested: 1,
        enriched: 1,
        alreadyComplete: 0,
        notFound: 0,
        ambiguous: 0,
        failed: 0,
        disabled: false,
      }),
    };
    app = express();
    app.use(
      createAdminIngestionRouter(
        new AuthService(authRepository),
        new MemoryRepository(),
        metadataEnricher,
      ),
    );
  });

  it('exige autenticación de administrador', async () => {
    const response = await request(app).post('/admin/screenings/import');
    expect(response.status).toBe(401);
  });

  it('procesa el XLSX y devuelve el resumen', async () => {
    const response = await request(app)
      .post('/admin/screenings/import')
      .set('Cookie', 'salateca_session=token')
      .set('Content-Type', xlsxMimeType)
      .send(await validWorkbook());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      runId: 44,
      status: 'succeeded',
      processed: 1,
      inserted: 1,
      rejected: 0,
      errors: [],
      metadata: { provider: 'tmdb', requested: 1, enriched: 1 },
    });
    expect(metadataEnricher.enrichMovies).toHaveBeenCalledWith([
      { title: 'La casa lobo', canonicalTitle: 'la-casa-lobo' },
    ]);
  });

  it('informa un archivo que no es XLSX', async () => {
    const response = await request(app)
      .post('/admin/screenings/import')
      .set('Cookie', 'salateca_session=token')
      .set('Content-Type', xlsxMimeType)
      .send(Buffer.from('contenido inválido'));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_excel_file');
  });
});
