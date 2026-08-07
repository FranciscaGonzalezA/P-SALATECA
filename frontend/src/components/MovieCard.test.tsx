import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { demoMovies } from '../data/demoCatalog';
import { MovieCard } from './MovieCard';

describe('MovieCard', () => {
  it('presenta metadatos, próxima función y abre la película correcta', async () => {
    const onOpen = vi.fn();
    render(<MovieCard movie={demoMovies[0]!} onOpen={onOpen} />);

    expect(screen.getByRole('heading', { name: 'La Casa Lobo' })).toBeInTheDocument();
    expect(screen.getByText(/75 min/)).toBeInTheDocument();
    expect(screen.getByText('2026-08-01 · 18:00')).toBeInTheDocument();

    const card = screen.getByRole('button', { name: 'Ver La Casa Lobo y sus funciones' });
    expect(screen.queryByText(/Ver película y funciones/)).not.toBeInTheDocument();

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
});
