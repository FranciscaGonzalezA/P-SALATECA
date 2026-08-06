import type { ScreeningImportResultDto } from '@salateca/contracts';
import { useState, type FormEvent } from 'react';
import { uploadScreeningsExcel } from '../api/adminScreeningsApi';
import { buildScreeningErrorCsv } from './screeningImportLog';

function downloadErrorLog(result: ScreeningImportResultDto) {
  const blob = new Blob([buildScreeningErrorCsv(result.errors)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `errores-importacion-${result.runId}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function statusLabel(status: ScreeningImportResultDto['status']): string {
  if (status === 'succeeded') return 'Completada';
  if (status === 'partially_succeeded') return 'Completada con observaciones';
  return 'Sin filas importadas';
}

type ExcelImporter = typeof uploadScreeningsExcel;

interface AdminScreeningsImportProps {
  importer?: ExcelImporter;
}

export function AdminScreeningsImport({
  importer = uploadScreeningsExcel,
}: AdminScreeningsImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScreeningImportResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Selecciona un archivo Excel con extensión .xlsx.');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await importer(file));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible importar la cartelera.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="admin-import" aria-labelledby="screenings-import-title">
      <div className="admin-import-copy">
        <p className="eyebrow">Carga masiva</p>
        <h2 id="screenings-import-title">Importar funciones desde Excel</h2>
        <p>
          Usa una hoja llamada <strong>Cartelera</strong> con las columnas Fecha parseada, Fecha
          texto, Pelicula, Sala y URL. La fuente se identifica automáticamente desde las URLs y las
          filas correctas se guardan aunque otras tengan errores.
        </p>
      </div>

      <form className="admin-import-form" onSubmit={submit}>
        <label className="admin-file-field">
          Archivo XLSX
          <input
            required
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span>{file ? file.name : 'Ningún archivo seleccionado'}</span>
        </label>
        <button type="submit" disabled={uploading}>
          {uploading ? 'Importando…' : 'Importar funciones'}
        </button>
      </form>

      {error && (
        <div role="alert" className="admin-message is-error admin-import-message">
          {error}
        </div>
      )}

      {result && (
        <div className="admin-import-result" role="status">
          <div className="admin-import-result-heading">
            <div>
              <span>Proceso #{result.runId}</span>
              <h3>{statusLabel(result.status)}</h3>
            </div>
            {result.errors.length > 0 && (
              <button
                type="button"
                className="outline-button"
                onClick={() => downloadErrorLog(result)}
              >
                Descargar log CSV
              </button>
            )}
          </div>
          <dl className="admin-import-summary">
            <div>
              <dt>Procesadas</dt>
              <dd>{result.processed}</dd>
            </div>
            <div>
              <dt>Nuevas</dt>
              <dd>{result.inserted}</dd>
            </div>
            <div>
              <dt>Actualizadas</dt>
              <dd>{result.updated}</dd>
            </div>
            <div>
              <dt>Duplicadas</dt>
              <dd>{result.duplicates}</dd>
            </div>
            <div>
              <dt>Con errores</dt>
              <dd>{result.rejected}</dd>
            </div>
          </dl>

          {result.errors.length > 0 && (
            <div className="admin-import-log">
              <table>
                <caption>Detalle de filas que requieren corrección</caption>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Campo</th>
                    <th>Valor</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((rowError, index) => (
                    <tr key={`${rowError.rowNumber}-${rowError.field}-${index}`}>
                      <td>{rowError.rowNumber}</td>
                      <td>{rowError.field}</td>
                      <td>{rowError.value || '—'}</td>
                      <td>{rowError.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
