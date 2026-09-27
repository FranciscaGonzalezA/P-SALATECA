import type { AdminPendingVenueDto, ChileRegionCode } from '@salateca/contracts';
import { useEffect, useState } from 'react';
import { fetchPendingVenues, validateVenueRegion } from '../api/adminVenuesApi';

const regions: ReadonlyArray<{ code: ChileRegionCode; name: string }> = [
  { code: 'CL-RM', name: 'Región Metropolitana de Santiago' },
  { code: 'CL-AP', name: 'Arica y Parinacota' },
  { code: 'CL-TA', name: 'Tarapacá' },
  { code: 'CL-AN', name: 'Antofagasta' },
  { code: 'CL-AT', name: 'Atacama' },
  { code: 'CL-CO', name: 'Coquimbo' },
  { code: 'CL-VS', name: 'Valparaíso' },
  { code: 'CL-LI', name: "Libertador General Bernardo O'Higgins" },
  { code: 'CL-ML', name: 'Maule' },
  { code: 'CL-NB', name: 'Ñuble' },
  { code: 'CL-BI', name: 'Biobío' },
  { code: 'CL-AR', name: 'La Araucanía' },
  { code: 'CL-LR', name: 'Los Ríos' },
  { code: 'CL-LL', name: 'Los Lagos' },
  { code: 'CL-AI', name: 'Aysén' },
  { code: 'CL-MA', name: 'Magallanes y de la Antártica Chilena' },
];

type VenueLoader = typeof fetchPendingVenues;
type VenueValidator = typeof validateVenueRegion;

interface AdminVenueValidationProps {
  loader?: VenueLoader;
  validator?: VenueValidator;
}

export function AdminVenueValidation({
  loader = fetchPendingVenues,
  validator = validateVenueRegion,
}: AdminVenueValidationProps) {
  const [venues, setVenues] = useState<AdminPendingVenueDto[]>([]);
  const [selection, setSelection] = useState<Record<number, ChileRegionCode>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loader()
      .then(setVenues)
      .catch((requestError: unknown) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar las salas pendientes.',
        ),
      )
      .finally(() => setLoading(false));
  }, [loader]);

  const validate = async (venue: AdminPendingVenueDto) => {
    const regionCode = selection[venue.id] ?? 'CL-RM';
    setSavingId(venue.id);
    setError(null);
    setMessage(null);
    try {
      await validator(venue.id, regionCode);
      setVenues((current) => current.filter((item) => item.id !== venue.id));
      const region = regions.find((item) => item.code === regionCode)?.name ?? regionCode;
      setMessage(`${venue.name} fue validada en ${region}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No fue posible validar la sala.',
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="admin-venue-validation" aria-labelledby="venue-validation-title">
      <div className="admin-venue-validation-heading">
        <div>
          <p className="eyebrow">Control territorial</p>
          <h2 id="venue-validation-title">Validar salas pendientes</h2>
          <p>
            Clasifica las salas importadas sin código de región. Solo las confirmadas en la Región
            Metropolitana aparecerán en la cartelera pública.
          </p>
        </div>
        {!loading && (
          <strong aria-label={`${venues.length} salas pendientes`}>{venues.length}</strong>
        )}
      </div>

      {error && (
        <div role="alert" className="admin-message is-error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="admin-message">
          {message}
        </div>
      )}

      {loading ? (
        <p>Cargando salas pendientes…</p>
      ) : venues.length === 0 ? (
        <p className="admin-venue-empty">No hay salas pendientes de validación.</p>
      ) : (
        <div className="admin-venue-list">
          {venues.map((venue) => (
            <article key={venue.id}>
              <div className="admin-venue-copy">
                <h3>{venue.name}</h3>
                <p>
                  {[venue.address, venue.municipality].filter(Boolean).join(' · ') ||
                    'Sin dirección registrada'}
                </p>
                <span>
                  {venue.upcomingScreeningCount} próximas · {venue.screeningCount} funciones totales
                </span>
                {venue.websiteUrl && (
                  <a href={venue.websiteUrl} target="_blank" rel="noreferrer">
                    Revisar sitio de la sala
                  </a>
                )}
              </div>
              <div className="admin-venue-action">
                <label htmlFor={`venue-region-${venue.id}`}>Región</label>
                <select
                  id={`venue-region-${venue.id}`}
                  aria-label={`Región para ${venue.name}`}
                  value={selection[venue.id] ?? 'CL-RM'}
                  onChange={(event) =>
                    setSelection((current) => ({
                      ...current,
                      [venue.id]: event.target.value as ChileRegionCode,
                    }))
                  }
                >
                  {regions.map((region) => (
                    <option key={region.code} value={region.code}>
                      {region.name} ({region.code})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={savingId !== null}
                  onClick={() => void validate(venue)}
                >
                  {savingId === venue.id ? 'Validando…' : 'Confirmar región'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
