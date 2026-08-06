import type { MovieSummaryDto } from '@salateca/contracts';

interface MovieCardProps {
  movie: MovieSummaryDto;
  onOpen: (movieId: number) => void;
}

export function MovieCard({ movie, onOpen }: MovieCardProps) {
  const nextScreening = movie.screenings[0];
  const posterClass = `movie-poster poster-tone-${movie.id % 5}`;

  return (
    <article className="movie-card">
      <div className={posterClass}>
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={`Afiche de ${movie.title}`} loading="lazy" />
        ) : (
          <>
            <span className="poster-kicker">Salateca presenta</span>
            <span className="poster-title">{movie.title}</span>
            <span className="poster-year">{movie.releaseYear ?? 'Cine independiente'}</span>
          </>
        )}
      </div>
      <div className="movie-card-content">
        <div className="tag-list" aria-label="Géneros">
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre.id}>{genre.name}</span>
          ))}
        </div>
        <h3>{movie.title}</h3>
        <p className="movie-meta">
          {movie.director ?? 'Dirección por confirmar'}
          {movie.durationMinutes ? ` · ${movie.durationMinutes} min` : ''}
        </p>
        {nextScreening ? (
          <div className="next-screening">
            <span>Próxima función</span>
            <strong>
              {nextScreening.date} · {nextScreening.time}
            </strong>
            <span>{nextScreening.venue.name}</span>
          </div>
        ) : (
          <p className="next-screening">Sin funciones próximas.</p>
        )}
        <button type="button" className="text-link" onClick={() => onOpen(movie.id)}>
          Ver película y funciones <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
