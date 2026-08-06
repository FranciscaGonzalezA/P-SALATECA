import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const { fetchCatalog } = vi.hoisted(() => ({ fetchCatalog: vi.fn() }));
vi.mock('./api/catalogApi', () => ({ fetchCatalog }));

vi.mock('./views/HomeView', () => ({
  HomeView: ({ onCatalog, onMovie }: { onCatalog: () => void; onMovie: (id: number) => void }) => (
    <div>
      <h1>Inicio simulado</h1>
      <button onClick={onCatalog}>Ir a cartelera</button>
      <button onClick={() => onMovie(7)}>Ir a película</button>
    </div>
  ),
}));
vi.mock('./views/CatalogView', () => ({
  CatalogView: ({ onMovie }: { onMovie: (id: number) => void }) => (
    <div>
      <h1>Catálogo simulado</h1>
      <button onClick={() => onMovie(7)}>Abrir película</button>
    </div>
  ),
}));
vi.mock('./views/MovieDetailView', () => ({
  MovieDetailView: ({ movieId, onBack }: { movieId: number; onBack: () => void }) => (
    <div>
      <h1>Película {movieId}</h1>
      <button onClick={onBack}>Volver</button>
    </div>
  ),
}));
vi.mock('./views/PostsView', () => ({
  PostsView: ({ onPost }: { onPost: (id: number) => void }) => (
    <div>
      <h1>Posts simulados</h1>
      <button onClick={() => onPost(4)}>Abrir post</button>
    </div>
  ),
}));
vi.mock('./views/PostDetailView', () => ({
  PostDetailView: ({ postId, onBack }: { postId: number; onBack: () => void }) => (
    <div>
      <h1>Post {postId}</h1>
      <button onClick={onBack}>Volver a posts</button>
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('scrollTo', vi.fn());
    fetchCatalog.mockReset().mockResolvedValue({
      items: [],
      total: 0,
      totalPages: 0,
      elapsedMs: 0,
      demo: true,
    });
  });

  it('navega entre rutas y actualiza la historia del navegador', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Inicio simulado' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ir a cartelera' }));
    expect(window.location.pathname).toBe('/cartelera');
    expect(screen.getByRole('heading', { name: 'Catálogo simulado' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir película' }));
    expect(window.location.pathname).toBe('/peliculas/7');
    expect(screen.getByRole('heading', { name: 'Película 7' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(window.location.pathname).toBe('/cartelera');
  });

  it('interpreta rutas directas y eventos popstate', async () => {
    window.history.replaceState({}, '', '/peliculas/7');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Película 7' })).toBeInTheDocument();

    window.history.replaceState({}, '', '/cartelera');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(await screen.findByRole('heading', { name: 'Catálogo simulado' })).toBeInTheDocument();

    window.history.replaceState({}, '', '/posts/4');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(await screen.findByRole('heading', { name: 'Post 4' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Volver a posts' }));
    expect(window.location.pathname).toBe('/posts');
    expect(screen.getByRole('heading', { name: 'Posts simulados' })).toBeInTheDocument();
  });
});
