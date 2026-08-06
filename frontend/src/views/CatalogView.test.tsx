import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoGenres, demoMovies, demoVenues } from '../data/demoCatalog';
import { CatalogView } from './CatalogView';

const { fetchCatalog, fetchGenres, fetchVenues } = vi.hoisted(() => ({
  fetchCatalog: vi.fn(),
  fetchGenres: vi.fn(),
  fetchVenues: vi.fn(),
}));

vi.mock('../api/catalogApi', () => ({
  fetchCatalog,
  fetchGenres,
  fetchVenues,
}));

describe('CatalogView', () => {
  beforeEach(() => {
    fetchCatalog.mockReset().mockResolvedValue({
      items: demoMovies.slice(0, 2),
      total: 8,
      totalPages: 2,
      elapsedMs: 2,
      demo: false,
    });
    fetchGenres.mockReset().mockResolvedValue(demoGenres);
    fetchVenues.mockReset().mockResolvedValue(demoVenues);
  });

  it('carga resultados y traduce filtros a una nueva consulta', async () => {
    const onMovie = vi.fn();
    render(<CatalogView onMovie={onMovie} />);
    expect(await screen.findByText('8 películas encontradas')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar película o dirección'), {
      target: { value: 'lobo' },
    });
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'lobo', page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    fireEvent.change(screen.getByLabelText('Sala'), {
      target: { value: 'sala-k' },
    });
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'lobo', venue: 'sala-k' }),
        expect.any(AbortSignal),
      ),
    );

    const movieButtons = await screen.findAllByRole('button', {
      name: /Ver película y funciones/,
    });
    await userEvent.click(movieButtons[0]!);
    expect(onMovie).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        { page: 1, pageSize: 6 },
        expect.any(AbortSignal),
      ),
    );
  });

  it('muestra origen demo y permite avanzar de página', async () => {
    fetchCatalog.mockResolvedValue({
      items: demoMovies.slice(0, 2),
      total: 8,
      totalPages: 2,
      elapsedMs: 0,
      demo: true,
    });
    render(<CatalogView onMovie={() => undefined} />);

    expect(await screen.findByRole('status')).toHaveTextContent('datos de demostración');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente →' }));
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(AbortSignal),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: '← Anterior' }));
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('presenta estados vacío y de error con recuperación', async () => {
    fetchCatalog.mockResolvedValueOnce({
      items: [],
      total: 0,
      totalPages: 0,
      elapsedMs: 1,
      demo: false,
    });
    const { unmount } = render(<CatalogView onMovie={() => undefined} />);
    expect(await screen.findByText('No hay funciones para estos filtros')).toBeInTheDocument();
    unmount();

    fetchCatalog.mockReset().mockRejectedValue(new Error('API no disponible'));
    render(<CatalogView onMovie={() => undefined} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API no disponible');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
  });
});
