import type { MovieSummaryDto } from '@salateca/contracts';
import type { MouseEvent } from 'react';

interface MovieCardProps {
  movie: MovieSummaryDto;
  onOpen: (movieId: number) => void;
}

function toTitleCase(title: string): string {
  return title
    .toLocaleLowerCase('es-CL')
    .replace(/(^|[\s([{¿¡'"-])(\p{L})/gu, (_, prefix: string, letter: string) => {
      return `${prefix}${letter.toLocaleUpperCase('es-CL')}`;
    });
}

export function MovieCard({ movie, onOpen }: MovieCardProps) {
  const nextScreening = movie.screenings[0];
  const posterClass = `movie-poster poster-tone-${movie.id % 5}`;
  const displayTitle = toTitleCase(movie.title);
  const openMovie = () => onOpen(movie.id);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      openMovie();
    }
  };

  return (
    <a
      href={`/peliculas/${movie.id}`}
      className="movie-card"
      aria-label={`Ver ${displayTitle} y sus funciones`}
      onClick={handleClick}
    >
      <div className={posterClass}>
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={`Afiche de ${displayTitle}`} loading="lazy" />
        ) : (
          <div className="poster-placeholder" aria-hidden="true">
            <span className="poster-kicker">Salateca presenta</span>
            <span className="poster-title">{displayTitle}</span>
            <span className="poster-year">{movie.releaseYear ?? 'Cine independiente'}</span>
          </div>
        )}

        <div className="movie-card-overlay" aria-hidden="true">
          <div>
            <p className="movie-meta">
              {movie.director ?? 'Director por confirmar'}
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
          </div>
          <span className="movie-card-cta">Haz clic para más información →</span>
        </div>
      </div>

      <div className="movie-card-content">
        <div className="tag-list" aria-label="Géneros">
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre.id}>{genre.name}</span>
          ))}
        </div>
        <h3>{displayTitle}</h3>
      </div>
    </a>
  );
}
