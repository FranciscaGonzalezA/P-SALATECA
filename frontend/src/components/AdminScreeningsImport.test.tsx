import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminScreeningsImport } from './AdminScreeningsImport';
import { buildScreeningErrorCsv } from './screeningImportLog';

const partialResult = {
  runId: 21,
  status: 'partially_succeeded' as const,
  processed: 2,
  inserted: 1,
  updated: 0,
  rejected: 1,
  duplicates: 0,
  metadata: {
    provider: 'tmdb' as const,
    requested: 1,
    enriched: 1,
    alreadyComplete: 0,
    notFound: 0,
    ambiguous: 0,
    failed: 0,
    disabled: false,
  },
  errors: [
    {
      rowNumber: 3,
      field: 'URL',
      code: 'invalid_url',
      message: 'La URL debe comenzar con http:// o https://.',
      value: 'ejemplo.cl',
    },
  ],
};

describe('AdminScreeningsImport', () => {
  it('sube un archivo y muestra el resumen y los errores por fila', async () => {
    const importer = vi.fn().mockResolvedValue(partialResult);
    render(<AdminScreeningsImport importer={importer} />);

    expect(screen.queryByLabelText('Nombre de la fuente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('URL principal de la fuente')).not.toBeInTheDocument();

    await userEvent.upload(
      screen.getByLabelText(/Archivo XLSX/),
      new File(['excel'], 'cartelera.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const submitButton = screen.getByRole('button', { name: 'Importar funciones' });
    fireEvent.submit(submitButton.closest('form')!);

    await waitFor(() =>
      expect(importer).toHaveBeenCalledWith(expect.objectContaining({ name: 'cartelera.xlsx' })),
    );
    expect(await screen.findByText('Completada con observaciones')).toBeInTheDocument();
    expect(screen.getByText('Fichas completadas')).toBeInTheDocument();
    expect(screen.getByText('ejemplo.cl')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar log CSV' })).toBeInTheDocument();
  });

  it('genera un CSV compatible con Excel', () => {
    const csv = buildScreeningErrorCsv(partialResult.errors);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Fila";"Campo";"Valor";"Código";"Detalle"');
    expect(csv).toContain('"3";"URL";"ejemplo.cl"');
  });
});
