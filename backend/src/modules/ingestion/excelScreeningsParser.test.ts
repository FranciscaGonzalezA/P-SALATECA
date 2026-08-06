import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  ExcelScreeningFileError,
  inferExcelIngestionSource,
  parseExcelScreenings,
} from './excelScreeningsParser.js';

const headers = ['Fecha parseada', 'Fecha texto', 'Pelicula', 'Sala', 'URL'];

async function workbookBuffer(rows: unknown[][], customHeaders = headers): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Cartelera');
  sheet.addRow(customHeaders);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('parseExcelScreenings', () => {
  it('normaliza filas válidas y conserva los errores con el número de fila', async () => {
    const records = await parseExcelScreenings(
      await workbookBuffer([
        [
          '2026-06-30T19:00:00',
          '30/06/2026 19:00',
          'La casa lobo',
          'Cineteca Nacional',
          'https://example.com/funcion',
        ],
        ['2026-02-31 20:00:00', '', '', 'Sala de prueba', 'sin-protocolo.example'],
      ]),
      { now: () => new Date('2026-06-01T12:00:00.000Z') },
    );

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      rowNumber: 2,
      source: {
        name: 'example.com',
        type: 'website',
        baseUrl: 'https://example.com',
      },
      normalizedPayload: {
        movieTitle: 'La casa lobo',
        venueName: 'Cineteca Nacional',
        startsAt: '2026-06-30T23:00:00.000Z',
        sourceTimezone: 'America/Santiago',
      },
    });
    expect(records[1]).toMatchObject({
      rowNumber: 3,
      validationIssues: expect.arrayContaining([
        expect.objectContaining({ field: 'Fecha parseada', code: 'invalid_datetime' }),
        expect.objectContaining({ field: 'Pelicula', code: 'required' }),
        expect.objectContaining({ field: 'URL', code: 'invalid_url' }),
      ]),
    });
  });

  it('tolera una de las dos fechas si la otra es válida', async () => {
    const [record] = await parseExcelScreenings(
      await workbookBuffer([
        ['', '2026-07-01 15:30:00', 'Película', 'Sala', 'https://example.com'],
      ]),
    );

    expect(record?.validationIssues).toBeUndefined();
    expect(record?.normalizedPayload).toMatchObject({ screeningTime: '15:30' });
  });

  it('procesa filas posteriores a espacios en blanco conservando su número real', async () => {
    const records = await parseExcelScreenings(
      await workbookBuffer([
        ['2026-07-01 15:30:00', '', 'Primera', 'Sala', 'https://example.com/1'],
        [],
        ['2026-07-02 15:30:00', '', 'Segunda', 'Sala', 'https://example.com/2'],
      ]),
    );

    expect(records.map((record) => record.rowNumber)).toEqual([2, 4]);
  });

  it('genera claves estables para títulos y salas con alfabetos no latinos', async () => {
    const [record] = await parseExcelScreenings(
      await workbookBuffer([
        ['2026-07-01 15:30:00', '', '七人の侍', '영화관', 'https://example.com'],
      ]),
    );

    expect(record?.validationIssues).toBeUndefined();
    expect(record?.normalizedPayload).toMatchObject({ movieKey: '七人の侍', venueKey: '영화관' });
  });

  it('infiere una fuente diferente para cada dominio incluido en el archivo', async () => {
    const records = await parseExcelScreenings(
      await workbookBuffer([
        ['2026-07-01 15:30:00', '', 'Película', 'Sala', 'https://www.cine.cl/funcion/1'],
        ['2026-07-02 16:30:00', '', 'Otra', 'Otra sala', 'https://tickets.cl/evento/2'],
      ]),
    );

    expect(inferExcelIngestionSource(records)).toEqual({
      name: 'cine.cl',
      type: 'website',
      baseUrl: 'https://www.cine.cl',
    });
    expect(records.map((record) => record.source)).toEqual([
      { name: 'cine.cl', type: 'website', baseUrl: 'https://www.cine.cl' },
      { name: 'tickets.cl', type: 'website', baseUrl: 'https://tickets.cl' },
    ]);
  });

  it('rechaza URLs que exceden el tamaño admitido por la base de datos', async () => {
    const oversizedUrl = `https://example.com/${'a'.repeat(2_100)}`;
    const [record] = await parseExcelScreenings(
      await workbookBuffer([['2026-07-01 15:30:00', '', 'Película', 'Sala', oversizedUrl]]),
    );

    expect(record?.validationIssues).toContainEqual(
      expect.objectContaining({ field: 'URL', code: 'too_long' }),
    );
  });

  it('usa una fuente interna para poder registrar un lote sin URLs válidas', async () => {
    const records = await parseExcelScreenings(
      await workbookBuffer([['2026-07-01 15:30:00', '', 'Película', 'Sala', 'url-sin-protocolo']]),
    );

    expect(inferExcelIngestionSource(records)).toEqual({
      name: 'Importación Excel administrativa',
      type: 'manual',
      baseUrl: 'salateca://admin/importaciones/excel',
    });
  });

  it('rechaza libros sin la estructura obligatoria', async () => {
    const buffer = await workbookBuffer([], ['Fecha', 'Pelicula']);
    await expect(parseExcelScreenings(buffer)).rejects.toEqual(
      expect.objectContaining<Partial<ExcelScreeningFileError>>({
        code: 'invalid_excel_file',
      }),
    );
  });
});
