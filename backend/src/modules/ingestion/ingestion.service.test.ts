import { describe, expect, it } from 'vitest';
import { ingestScreenings } from './ingestion.service.js';
import type {
  IngestionRepository,
  IngestionRunStatus,
  IngestionSource,
  IngestionSummary,
  IngestionTransaction,
  IngestionValidationIssue,
  NormalizedScreeningDto,
  PublicationOutcome,
} from './ingestion.types.js';

class MemoryIngestionTransaction implements IngestionTransaction {
  readonly staged: Array<{ id: number; status: string }> = [];
  readonly errors: IngestionValidationIssue[] = [];
  readonly sources: IngestionSource[] = [];
  readonly publishedSourceIds: number[] = [];
  finished: { runId: number; status: IngestionRunStatus; summary: IngestionSummary } | undefined;
  private publicationIndex = 0;

  constructor(
    private readonly outcomes: readonly PublicationOutcome[],
    private readonly publicationErrorAt?: number,
  ) {}

  async upsertSource(source: IngestionSource): Promise<number> {
    this.sources.push(source);
    return 10 + this.sources.length - 1;
  }

  async createRun(): Promise<number> {
    return 20;
  }

  async stageRecord(): Promise<number> {
    const id = this.staged.length + 1;
    this.staged.push({ id, status: 'pending' });
    return id;
  }

  async recordErrors(
    _runId: number,
    _stagingRecordId: number,
    issues: readonly IngestionValidationIssue[],
  ): Promise<void> {
    this.errors.push(...issues);
  }

  async publishScreening(sourceId: number): Promise<PublicationOutcome> {
    this.publishedSourceIds.push(sourceId);
    if (this.publicationIndex === this.publicationErrorAt) {
      this.publicationIndex += 1;
      throw new Error('fallo controlado');
    }
    const outcome = this.outcomes[this.publicationIndex] ?? 'inserted';
    this.publicationIndex += 1;
    return outcome;
  }

  async markStaging(stagingRecordId: number, status: string): Promise<void> {
    const staged = this.staged.find((item) => item.id === stagingRecordId);
    if (staged) {
      staged.status = status;
    }
  }

  async runInSavepoint<T>(_name: string, operation: () => Promise<T>): Promise<T> {
    return operation();
  }

  async finishRun(
    runId: number,
    status: IngestionRunStatus,
    summary: IngestionSummary,
  ): Promise<void> {
    this.finished = { runId, status, summary: { ...summary } };
  }
}

class MemoryIngestionRepository implements IngestionRepository {
  constructor(readonly transaction: MemoryIngestionTransaction) {}

  async withTransaction<T>(
    operation: (transaction: IngestionTransaction) => Promise<T>,
  ): Promise<T> {
    return operation(this.transaction);
  }
}

const normalizedRecord: NormalizedScreeningDto = {
  movieTitle: 'La casa lobo',
  venueName: 'Cineteca Nacional',
  movieKey: 'la-casa-lobo',
  venueKey: 'cineteca-nacional',
  screeningDate: '2026-08-01',
  screeningTime: '20:00',
  startsAt: '2026-08-02T00:00:00.000Z',
  sourceTimezone: 'America/Santiago',
  sourceUrl: 'https://example.com/cartelera',
  sourceType: 'website',
  capturedAt: '2026-07-27T12:00:00.000Z',
  duplicateKey: 'la-casa-lobo:cineteca-nacional:2026-08-02T00:00:00.000Z',
};

describe('ingestScreenings', () => {
  it('resume inserciones, actualizaciones, duplicados y rechazos', async () => {
    const transaction = new MemoryIngestionTransaction(['inserted', 'updated', 'duplicate']);
    const repository = new MemoryIngestionRepository(transaction);

    const result = await ingestScreenings(repository, {
      source: {
        name: 'Fuente de prueba',
        type: 'website',
        baseUrl: 'https://example.com',
      },
      records: [
        { rawPayload: normalizedRecord, normalizedPayload: normalizedRecord },
        {
          rawPayload: { ...normalizedRecord, format: '2D' },
          normalizedPayload: { ...normalizedRecord, format: '2D' },
        },
        { rawPayload: normalizedRecord, normalizedPayload: normalizedRecord },
        {
          rawPayload: { movieTitle: '' },
          normalizedPayload: { movieTitle: '' },
        },
      ],
    });

    expect(result).toMatchObject({
      runId: 20,
      status: 'partially_succeeded',
      processed: 4,
      inserted: 1,
      updated: 1,
      rejected: 1,
      duplicates: 1,
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ rowNumber: 4, field: 'venueName' })]),
    );
    expect(transaction.staged.map((item) => item.status)).toEqual([
      'valid',
      'valid',
      'duplicate',
      'rejected',
    ]);
    expect(transaction.errors.length).toBeGreaterThan(0);
    expect(transaction.finished?.status).toBe('partially_succeeded');
  });

  it('marca el lote como fallido cuando todos los registros son rechazados', async () => {
    const transaction = new MemoryIngestionTransaction([]);
    const result = await ingestScreenings(new MemoryIngestionRepository(transaction), {
      source: { name: 'Manual', type: 'manual', baseUrl: 'https://example.com' },
      records: [{ rawPayload: null, normalizedPayload: null }],
    });

    expect(result.status).toBe('failed');
    expect(result.rejected).toBe(1);
    expect(transaction.finished?.status).toBe('failed');
  });

  it('publica cada fila con la fuente inferida desde su propia URL', async () => {
    const transaction = new MemoryIngestionTransaction(['inserted', 'inserted']);
    const rowSources: IngestionSource[] = [
      { name: 'cine.cl', type: 'website', baseUrl: 'https://cine.cl' },
      { name: 'tickets.cl', type: 'website', baseUrl: 'https://tickets.cl' },
    ];

    const result = await ingestScreenings(new MemoryIngestionRepository(transaction), {
      source: { name: 'cine.cl', type: 'website', baseUrl: 'https://cine.cl' },
      records: rowSources.map((source, index) => ({
        source,
        rawPayload: normalizedRecord,
        normalizedPayload: {
          ...normalizedRecord,
          sourceUrl: `${source.baseUrl}/funcion/${index + 1}`,
          duplicateKey: `${normalizedRecord.duplicateKey}-${index}`,
        },
      })),
    });

    expect(result.inserted).toBe(2);
    expect(transaction.sources).toEqual([rowSources[0], ...rowSources]);
    expect(transaction.publishedSourceIds).toEqual([11, 12]);
  });

  it('aísla un error de persistencia y continúa con el siguiente registro', async () => {
    const transaction = new MemoryIngestionTransaction(['inserted'], 0);
    const result = await ingestScreenings(new MemoryIngestionRepository(transaction), {
      source: { name: 'Fuente', type: 'website', baseUrl: 'https://example.com' },
      records: [
        { rawPayload: normalizedRecord, normalizedPayload: normalizedRecord },
        { rawPayload: normalizedRecord, normalizedPayload: normalizedRecord },
      ],
    });

    expect(result).toMatchObject({
      status: 'partially_succeeded',
      inserted: 1,
      rejected: 1,
    });
    expect(transaction.errors).toContainEqual(
      expect.objectContaining({ code: 'persistence_error', message: 'fallo controlado' }),
    );
  });

  it('considera exitoso un lote vacío', async () => {
    const result = await ingestScreenings(
      new MemoryIngestionRepository(new MemoryIngestionTransaction([])),
      {
        source: { name: 'Fuente', type: 'api', baseUrl: 'https://example.com' },
        records: [],
      },
    );

    expect(result).toMatchObject({ status: 'succeeded', processed: 0, rejected: 0 });
  });
});
