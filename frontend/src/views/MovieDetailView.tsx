import type { MovieDetailDto } from '@salateca/contracts';
import { useEffect, useState } from 'react';
import { fetchMovie } from '../api/catalogApi';

interface MovieDetailViewProps {
  movieId: number;
  onBack: () => void;
}

export function MovieDetailView({ movieId, onBack }: MovieDetailViewProps) {
  const [movie, setMovie] = useState<MovieDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchMovie(movieId, controller.signal)
      .then((result) => {
        setMovie(result.movie);
        setDemo(result.demo);
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(
            requestError instanceof Error ? requestError.message : 'Película no disponible.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [movieId]);

  if (loading) {
    return <div className="detail-loading page-section">Cargando película…</div>;
  }

  if (error || !movie) {
    return (
      <div className="state-card detail-error page-section">
        <h1>No encontramos esta película</h1>
        <p>{error ?? 'La información solicitada no está disponible.'}</p>
        <button type="button" onClick={onBack}>
          Volver a la cartelera
        </button>
      </div>
    );
  }

  return (
    <article className="movie-detail page-section">
      <button type="button" className="back-button" onClick={onBack}>
        ← Volver a la cartelera
      </button>
      {demo && <p className="demo-notice">Detalle con datos de demostración.</p>}

      <div className="detail-hero">
        <div className={`detail-poster poster-tone-${movie.id % 5}`}>
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={`Afiche de ${movie.title}`} />
          ) : (
            <>
              <span>Salateca presenta</span>
              <strong>{movie.title}</strong>
              <small>{movie.releaseYear}</small>
            </>
          )}
        </div>
        <div className="detail-copy">
          <div className="tag-list">
            {movie.genres.map((genre) => (
              <span key={genre.id}>{genre.name}</span>
            ))}
          </div>
          <h1>{movie.title}</h1>
          <p className="detail-meta">
            {[movie.releaseYear, movie.durationMinutes && `${movie.durationMinutes} min`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <dl>
            <div>
              <dt>Dirección</dt>
              <dd>{movie.director ?? 'Por confirmar'}</dd>
            </div>
            {movie.tmdbRating !== null && (
              <div>
                <dt>Valoración TMDB</dt>
                <dd>
                  {movie.tmdbRating.toFixed(1)}/10
                  {movie.tmdbVoteCount !== null
                    ? ` · ${movie.tmdbVoteCount.toLocaleString('es-CL')} votos`
                    : ''}
                </dd>
              </div>
            )}
            <div>
              <dt>Última actualización</dt>
              <dd>{new Date(movie.updatedAt).toLocaleDateString('es-CL')}</dd>
            </div>
          </dl>
          <p className="synopsis">{movie.synopsis ?? 'Sinopsis no disponible.'}</p>
        </div>
      </div>

      <section className="screenings-section" aria-labelledby="screenings-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2 id="screenings-title">Próximas funciones</h2>
          </div>
        </div>
        <div className="screening-list">
          {movie.screenings.length === 0 ? (
            <p className="state-card">No hay funciones próximas publicadas.</p>
          ) : (
            movie.screenings.map((screening) => (
              <article key={screening.id}>
                <time dateTime={screening.startsAt}>
                  <strong>{screening.date}</strong>
                  <span>{screening.time}</span>
                </time>
                <div>
                  <h3>{screening.venue.name}</h3>
                  <p>
                    {[screening.venue.municipality, screening.language, screening.format]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <small>
                    Fuente: {screening.source.name} · Capturado el{' '}
                    {new Date(screening.capturedAt).toLocaleDateString('es-CL')}
                  </small>
                </div>
                <a href={screening.officialUrl} target="_blank" rel="noreferrer">
                  Confirmar en sitio oficial
                </a>
              </article>
            ))
          )}
        </div>
      </section>
    </article>
  );
}
