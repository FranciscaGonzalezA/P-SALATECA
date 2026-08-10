import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoMovies } from '../data/demoCatalog';
import { MovieDetailView } from './MovieDetailView';

const { fetchMovie } = vi.hoisted(() => ({ fetchMovie: vi.fn() }));
vi.mock('../api/catalogApi', () => ({ fetchMovie }));

describe('MovieDetailView', () => {
  beforeEach(() => {
    fetchMovie.mockReset();
  });

  it('muestra trazabilidad de funciones y permite volver', async () => {
    const onBack = vi.fn();
    fetchMovie.mockResolvedValue({ movie: demoMovies[0], demo: true });
    render(<MovieDetailView movieId={1} onBack={onBack} />);

    expect(await screen.findByRole('heading', { name: 'La casa lobo' })).toBeInTheDocument();
    expect(screen.getByText('Detalle con datos de demostración.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Confirmar en sitio oficial' })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: '← Volver a la cartelera' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('comunica ausencia de próximas funciones', async () => {
    fetchMovie.mockResolvedValue({
      movie: { ...demoMovies[0], screenings: [] },
      demo: false,
    });
    render(<MovieDetailView movieId={1} onBack={() => undefined} />);

    expect(await screen.findByText('No hay funciones próximas publicadas.')).toBeInTheDocument();
  });

  it('muestra la valoración de TMDB junto con su cantidad de votos', async () => {
    fetchMovie.mockResolvedValue({
      movie: { ...demoMovies[0], tmdbRating: 7.6, tmdbVoteCount: 1234 },
      demo: false,
    });
    render(<MovieDetailView movieId={1} onBack={() => undefined} />);

    expect(await screen.findByText('Valoración TMDB')).toBeInTheDocument();
    expect(screen.getByText(/7\.6\/10/)).toHaveTextContent('1.234 votos');
  });

  it('presenta un error recuperable si el detalle falla', async () => {
    fetchMovie.mockRejectedValue(new Error('Película eliminada'));
    render(<MovieDetailView movieId={404} onBack={() => undefined} />);

    expect(await screen.findByText('No encontramos esta película')).toBeInTheDocument();
    expect(screen.getByText('Película eliminada')).toBeInTheDocument();
  });
});
