import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { demoMovies } from '../data/demoCatalog';
import { MovieCard } from './MovieCard';

describe('MovieCard', () => {
  it('gira con clic derecho y abre la película correcta con clic izquierdo', async () => {
    const onOpen = vi.fn();
    render(<MovieCard movie={demoMovies[0]!} onOpen={onOpen} />);

    expect(screen.getByRole('heading', { name: 'La Casa Lobo' })).toBeInTheDocument();
    expect(screen.getByText(/75 min/)).toBeInTheDocument();
    expect(screen.getByText('2026-08-01 · 18:00')).toBeInTheDocument();
    expect(screen.getByText('Sinopsis')).toBeInTheDocument();
    expect(screen.getByText('Clic derecho para volver')).toHaveClass(
      'movie-card-reset-hint-desktop',
    );
    expect(screen.getByText('Mantén presionado para volver')).toHaveClass(
      'movie-card-reset-hint-mobile',
    );
    expect(
      screen.getByText(
        'Una joven escapa de una colonia alemana y se refugia en una casa donde la realidad comienza a transformarse.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Haz clic para más información →')).toHaveLength(2);

    const card = screen.getByRole('link', { name: 'Ver La Casa Lobo y sus funciones' });
    expect(card).toHaveAttribute('href', '/peliculas/1');
    expect(card).not.toHaveClass('is-flipped');

    await userEvent.pointer({ keys: '[MouseRight]', target: card });
    expect(card).toHaveClass('is-flipped');
    expect(onOpen).not.toHaveBeenCalled();

    await userEvent.pointer({ keys: '[MouseRight]', target: card });
    expect(card).not.toHaveClass('is-flipped');

    await userEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith(1);

    onOpen.mockClear();
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('usa afiche accesible cuando existe y comunica ausencia de funciones', () => {
    render(
      <MovieCard
        movie={{ ...demoMovies[0]!, posterUrl: 'https://example.com/poster.jpg', screenings: [] }}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getByRole('img', { name: 'Afiche de La Casa Lobo' })).toHaveAttribute(
      'loading',
      'lazy',
    );
    expect(screen.getByText('Sin funciones próximas.')).toBeInTheDocument();
  });

  it('muestra una insignia numérica solo cuando la tarjeta es destacada', () => {
    const movie = { ...demoMovies[0]!, tmdbRating: 7.6, tmdbVoteCount: 1234 };
    const { rerender } = render(<MovieCard movie={movie} onOpen={() => undefined} />);

    expect(screen.queryByLabelText(/Valoración TMDB/)).not.toBeInTheDocument();

    rerender(<MovieCard movie={movie} onOpen={() => undefined} showFeaturedScore />);
    expect(screen.getByLabelText('Valoración TMDB: 7.6 de 10, 1234 votos')).toHaveTextContent(
      '★7,61.234 votos',
    );
  });
});
