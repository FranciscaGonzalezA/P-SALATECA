import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { demoMovies } from '../data/demoCatalog';
import { HomeView } from './HomeView';

describe('HomeView', () => {
  it('muestra hasta tres destacadas y conecta sus acciones', async () => {
    const onCatalog = vi.fn();
    const onMovie = vi.fn();
    render(
      <HomeView
        featured={demoMovies.map((movie, index) => ({
          ...movie,
          tmdbRating: 8 - index / 10,
          tmdbVoteCount: 1000 - index,
        }))}
        featuredError={false}
        onCatalog={onCatalog}
        onMovie={onMovie}
        onRetryFeatured={() => undefined}
      />,
    );

    expect(screen.getByText('RM')).toBeInTheDocument();
    expect(screen.queryByText('ÑUBLE')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ver .+ y sus funciones/ })).toHaveLength(3);
    expect(screen.getAllByLabelText(/Valoración TMDB/)).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Descubrir la cartelera' }));
    await userEvent.click(screen.getAllByRole('link', { name: /Ver .+ y sus funciones/ })[0]!);

    expect(onCatalog).toHaveBeenCalledOnce();
    expect(onMovie).toHaveBeenCalledWith(1);

    const newsletterForm = screen.getByLabelText('Correo electrónico').closest('form');
    expect(newsletterForm).not.toBeNull();
    fireEvent.submit(newsletterForm!);
  });

  it('avisa cuando falla la carga de funciones destacadas y permite reintentar', async () => {
    const onRetryFeatured = vi.fn();
    render(
      <HomeView
        featured={[]}
        featuredError
        onCatalog={() => undefined}
        onMovie={() => undefined}
        onRetryFeatured={onRetryFeatured}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos cargar las funciones destacadas',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetryFeatured).toHaveBeenCalledOnce();
  });
});
