import type { ScreeningImportErrorDto } from '@salateca/contracts';

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildScreeningErrorCsv(errors: readonly ScreeningImportErrorDto[]): string {
  const rows = [
    ['Fila', 'Campo', 'Valor', 'Código', 'Detalle'],
    ...errors.map((error) => [
      error.rowNumber,
      error.field,
      error.value,
      error.code,
      error.message,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
}
