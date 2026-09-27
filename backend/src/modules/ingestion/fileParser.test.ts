import { describe, expect, it } from 'vitest';
import { parseCsvCandidates, parseCsvRows, parseJsonCandidates } from './fileParser.js';

describe('parseJsonCandidates', () => {
  it('acepta un arreglo de registros normalizados', () => {
    const result = parseJsonCandidates('[{"movieTitle":"La casa lobo"}]');
    expect(result).toEqual([
      {
        rawPayload: { movieTitle: 'La casa lobo' },
        normalizedPayload: { movieTitle: 'La casa lobo' },
      },
    ]);
  });

  it('acepta un contenedor records y conserva payloads diferenciados', () => {
    const result = parseJsonCandidates(
      '{"records":[{"rawPayload":{"title":"original"},"normalizedPayload":{"movieTitle":"Normalizada"}}]}',
    );

    expect(result).toEqual([
      {
        rawPayload: { title: 'original' },
        normalizedPayload: { movieTitle: 'Normalizada' },
      },
    ]);
  });

  it('rechaza documentos JSON que no contienen una colección', () => {
    expect(() => parseJsonCandidates('{"movieTitle":"Única"}')).toThrow(
      'El JSON debe ser un arreglo',
    );
  });
});

describe('parseCsvRows', () => {
  it('respeta comas, saltos y comillas escapadas', () => {
    const rows = parseCsvRows(
      'movieTitle,venueName,synopsis\r\n"La casa, lobo","Sala ""K""","Texto breve"\r\n',
    );
    expect(rows).toEqual([
      {
        movieTitle: 'La casa, lobo',
        venueName: 'Sala "K"',
        synopsis: 'Texto breve',
      },
    ]);
  });

  it('convierte filas CSV en candidatos trazables', () => {
    const [candidate] = parseCsvCandidates(
      'movieTitle,venueName\nLa casa lobo,Cineteca Nacional\n',
    );
    expect(candidate?.rawPayload).toEqual({
      movieTitle: 'La casa lobo',
      venueName: 'Cineteca Nacional',
    });
    expect(candidate?.normalizedPayload).toEqual(candidate?.rawPayload);
  });

  it.each([
    ['movieTitle,movieTitle\nA,B', 'columnas duplicadas'],
    ['movieTitle,venueName\nA', 'cantidad de columnas esperada'],
    ['movieTitle,venueName\n"A,B', 'sin cerrar'],
    [',venueName\nA,B', 'cabecera válida'],
  ])('rechaza CSV inválido: %s', (content, expectedMessage) => {
    expect(() => parseCsvRows(content)).toThrow(expectedMessage);
  });

  it('elimina BOM, filas vacías y campos opcionales vacíos', () => {
    expect(parseCsvRows('\uFEFFmovieTitle,format\r\n\r\nLa casa lobo,\r\n')).toEqual([
      { movieTitle: 'La casa lobo' },
    ]);
  });
});
