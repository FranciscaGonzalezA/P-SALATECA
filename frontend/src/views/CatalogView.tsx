import type { GenreDto, MovieSummaryDto, VenueDto } from '@salateca/contracts';
import { useEffect, useState } from 'react';
import { fetchCatalog, fetchGenres, fetchVenues, type CatalogQuery } from '../api/catalogApi';
import { MovieCard } from '../components/MovieCard';

interface CatalogViewProps {
  onMovie: (movieId: number) => void;
}

const initialQuery: CatalogQuery = {
  page: 1,
  pageSize: 20,
};

export function CatalogView({ onMovie }: CatalogViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [movies, setMovies] = useState<MovieSummaryDto[]>([]);
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [genres, setGenres] = useState<GenreDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchVenues(controller.signal), fetchGenres(controller.signal)])
      .then(([venueItems, genreItems]) => {
        setVenues(venueItems);
        setGenres(genreItems);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchCatalog(query, controller.signal)
      .then((result) => {
        setMovies(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setDemo(result.demo);
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible cargar la cartelera.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query]);

  const updateQuery = (changes: Partial<CatalogQuery>) => {
    setLoading(true);
    setError(null);
    setQuery((current) => ({ ...current, ...changes, page: changes.page ?? 1 }));
  };

  const resetQuery = () => {
    setLoading(true);
    setError(null);
    setQuery(initialQuery);
  };

  return (
    <section className="catalog-page page-section">
      <header className="catalog-heading">
        <p className="eyebrow">Programación independiente</p>
        <h1>Cartelera semanal</h1>
        <p>
          Filtra por fecha, sala, horario o género y confirma cada función en su fuente oficial.
        </p>
      </header>

      {demo && (
        <div className="demo-notice" role="status">
          Vista con datos de demostración. Al conectar MySQL se utilizará la cartelera de la API.
        </div>
      )}

      <form className="filter-panel" onSubmit={(event) => event.preventDefault()}>
        <div className="search-field">
          <label htmlFor="catalog-search">Buscar película o dirección</label>
          <input
            id="catalog-search"
            type="search"
            value={query.search ?? ''}
            placeholder="Ej. cine chileno"
            onChange={(event) => updateQuery({ search: event.target.value || undefined })}
          />
        </div>
        <div>
          <label htmlFor="catalog-date">Fecha</label>
          <input
            id="catalog-date"
            type="date"
            value={query.date ?? ''}
            onChange={(event) => updateQuery({ date: event.target.value || undefined })}
          />
        </div>
        <div>
          <label htmlFor="catalog-time">Horario</label>
          <input
            id="catalog-time"
            type="time"
            value={query.time ?? ''}
            onChange={(event) => updateQuery({ time: event.target.value || undefined })}
          />
        </div>
        <div>
          <label htmlFor="catalog-venue">Sala</label>
          <select
            id="catalog-venue"
            value={query.venue ?? ''}
            onChange={(event) => updateQuery({ venue: event.target.value || undefined })}
          >
            <option value="">Todas las salas</option>
            {venues.map((venue) => (
              <option value={venue.slug} key={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="catalog-genre">Género</label>
          <select
            id="catalog-genre"
            value={query.genre ?? ''}
            onChange={(event) => updateQuery({ genre: event.target.value || undefined })}
          >
            <option value="">Todos los géneros</option>
            {genres.map((genre) => (
              <option value={genre.slug} key={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="clear-button" onClick={resetQuery}>
          Limpiar filtros
        </button>
      </form>

      <div className="results-bar" aria-live="polite">
        <p>{loading ? 'Actualizando cartelera…' : `${total} películas encontradas`}</p>
        <span>Información actualizada desde cada fuente</span>
      </div>

      {loading ? (
        <div className="loading-grid" aria-label="Cargando cartelera">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="loading-card" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="state-card error-state" role="alert">
          <h2>No pudimos cargar la cartelera</h2>
          <p>{error}</p>
          <button type="button" onClick={() => updateQuery({ page: query.page })}>
            Reintentar
          </button>
        </div>
      ) : movies.length === 0 ? (
        <div className="state-card">
          <h2>No hay funciones para estos filtros</h2>
          <p>Prueba otra fecha o amplía la selección de salas y géneros.</p>
          <button type="button" onClick={resetQuery}>
            Ver toda la cartelera
          </button>
        </div>
      ) : (
        <div className="movie-grid">
          {movies.map((movie) => (
            <MovieCard movie={movie} onOpen={onMovie} key={movie.id} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Páginas de cartelera">
          <button
            type="button"
            disabled={query.page === 1}
            onClick={() => updateQuery({ page: query.page - 1 })}
          >
            ← Anterior
          </button>
          <span>
            Página {query.page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={query.page >= totalPages}
            onClick={() => updateQuery({ page: query.page + 1 })}
          >
            Siguiente →
          </button>
        </nav>
      )}
    </section>
  );
}
