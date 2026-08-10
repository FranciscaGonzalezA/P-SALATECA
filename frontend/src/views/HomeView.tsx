import type { MovieSummaryDto } from '@salateca/contracts';
import { MovieCard } from '../components/MovieCard';

interface HomeViewProps {
  featured: MovieSummaryDto[];
  onCatalog: () => void;
  onMovie: (movieId: number) => void;
}

export function HomeView({ featured, onCatalog, onMovie }: HomeViewProps) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-orbit" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">Pensar el cine como una geografía</p>
          <h1>
            Salateca
            <span>de cine</span>
          </h1>
          <p>Reúne artículos y la cartelera semanal de salas independientes en un solo lugar.</p>
          <button type="button" className="primary-button" onClick={onCatalog}>
            Descubrir la cartelera
          </button>
        </div>
        <button className="scroll-cue" type="button" onClick={onCatalog}>
          <span>Explorar funciones</span>
          <span aria-hidden="true">↓</span>
        </button>
      </section>

      <section id="destacados" className="editorial-section page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Boletín cultural</p>
            <h2>Historias, salas y películas para encontrarse.</h2>
          </div>
          <button type="button" className="outline-button" onClick={onCatalog}>
            Ver toda la cartelera
          </button>
        </div>

        <div className="editorial-grid">
          <article className="feature-story">
            <div className="feature-art" aria-hidden="true">
              <span>RM</span>
              <small>Cine independiente metropolitano</small>
            </div>
            <div>
              <span className="story-label">Destacado</span>
              <h3>El cine independiente se encuentra en la Región Metropolitana.</h3>
              <p>
                Una selección editorial para seguir salas, retrospectivas y nuevas miradas dentro
                del circuito cultural metropolitano.
              </p>
            </div>
          </article>

          <article className="map-story">
            <div className="map-lines" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="story-label">Mapa</span>
            <h3>Salas independientes</h3>
            <p>Encuentra espacios culturales y revisa su programación desde una vista común.</p>
            <button type="button" className="text-link" onClick={onCatalog}>
              Explorar por sala <span aria-hidden="true">→</span>
            </button>
          </article>
        </div>
      </section>

      <section className="page-section featured-catalog">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Esta semana</p>
            <h2>Funciones destacadas</h2>
          </div>
        </div>
        <div className="movie-grid">
          {featured.slice(0, 3).map((movie) => (
            <MovieCard movie={movie} onOpen={onMovie} showFeaturedScore key={movie.id} />
          ))}
        </div>
      </section>

      <section className="newsletter-section">
        <div>
          <p className="eyebrow">Una vez por semana</p>
          <h2>La cartelera en tu correo.</h2>
          <p>Próximamente podrás recibir una selección breve de estrenos, ciclos y funciones.</p>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="newsletter-email">Correo electrónico</label>
          <div>
            <input id="newsletter-email" type="email" placeholder="tu@correo.cl" disabled />
            <button type="submit" disabled>
              Próximamente
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
