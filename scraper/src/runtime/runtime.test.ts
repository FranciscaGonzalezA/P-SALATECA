import { describe, expect, it } from 'vitest';
import type { SourceConnector } from '../connectors/sourceConnector.js';
import { BackendPublisher } from './backendPublisher.js';
import { assertCollectionThresholds, collectFromConnectors } from './collectionRunner.js';
import { scheduledRunKey } from './weeklyScheduler.js';

function connector(id: string, collect: SourceConnector['collect']): SourceConnector {
  return { id, name: id, type: 'website', sourceUrl: new URL(`https://example.com/${id}`), collect };
}

describe('ejecución del scraper', () => {
  it('conserva los éxitos y reporta cada fuente fallida', async () => {
    const report = await collectFromConnectors([
      connector('ok', async () => [
        {
          movieTitle: 'Película',
          venueName: 'Sala',
          screeningDate: '2026-08-12',
          screeningTime: '19:00',
          sourceUrl: 'https://example.com/ok/evento',
          sourceType: 'website',
        },
      ]),
      connector('error', async () => {
        throw new Error('selector roto');
      }),
    ]);
    expect(report.summary).toMatchObject({ successfulSources: 1, failedSources: 1, acceptedRecords: 1 });
    expect(() => assertCollectionThresholds(report, 2, 1)).toThrow(/Sólo respondieron/);
    expect(() => assertCollectionThresholds(report, 1, 2)).toThrow(/Sólo se obtuvieron/);
  });

  it('publica con token de servicio y el contrato de staging', async () => {
    let request: RequestInit | undefined;
    const publisher = new BackendPublisher(
      new URL('http://localhost:3000/api/v1'),
      'secret',
      async (_url, init) => {
        request = init;
        return new Response(
          JSON.stringify({
            data: { runId: 1, status: 'succeeded', processed: 1, inserted: 1, updated: 0, rejected: 0, duplicates: 0 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    );
    const result = await publisher.publish({
      id: 'fuente',
      name: 'Fuente',
      sourceType: 'website',
      sourceUrl: 'https://example.com',
      status: 'succeeded',
      rawRecords: [
        {
          movieTitle: 'Película',
          venueName: 'Sala',
          screeningDate: '2026-08-12',
          screeningTime: '19:00',
          sourceUrl: 'https://example.com/evento',
          sourceType: 'website',
        },
      ],
    });
    expect(result.inserted).toBe(1);
    expect((request?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('activa una sola clave semanal en la zona configurada', () => {
    const schedule = { day: 'wednesday', time: '09:00', timezone: 'America/Santiago' };
    expect(scheduledRunKey(new Date('2026-08-12T13:00:00Z'), schedule)).toBe('2026-08-12T09:00');
    expect(scheduledRunKey(new Date('2026-08-12T13:01:00Z'), schedule)).toBeUndefined();
  });
});
