import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoGenres, demoMovies, demoVenues } from '../data/demoCatalog';
import { buildPaginationItems } from '../utils/pagination';
import { localDateValue } from '../utils/localDate';
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

  it('representa las tarjetas actuales mientras carga la cartelera', () => {
    fetchCatalog.mockReset().mockReturnValue(new Promise(() => undefined));
    const { container } = render(<CatalogView onMovie={() => undefined} />);

    expect(screen.getByLabelText('Cargando cartelera')).toBeInTheDocument();
    expect(container.querySelectorAll('.loading-card')).toHaveLength(6);
    expect(container.querySelectorAll('.loading-poster')).toHaveLength(6);
    expect(container.querySelectorAll('.loading-card-content')).toHaveLength(6);
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

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'featured');
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'lobo', venue: 'sala-k', sort: 'featured', page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'alphabetical-desc');
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'alphabetical-desc', page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    const movieButtons = await screen.findAllByRole('link', {
      name: /Ver .+ y sus funciones/,
    });
    await userEvent.click(movieButtons[0]!);
    expect(onMovie).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        { page: 1, pageSize: 30 },
        expect.any(AbortSignal),
      ),
    );
  });

  it('permite desplegar y contraer los filtros', async () => {
    render(<CatalogView onMovie={() => undefined} />);

    const toggle = screen.getByRole('button', { name: 'Mostrar filtros' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Ocultar filtros' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('min', localDateValue());
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('upcoming');
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

  it('muestra hasta cinco páginas clickeables y usa elipsis al navegar', async () => {
    fetchCatalog.mockResolvedValue({
      items: demoMovies.slice(0, 2),
      total: 200,
      totalPages: 10,
      elapsedMs: 0,
      demo: false,
    });
    render(<CatalogView onMovie={() => undefined} />);

    expect(await screen.findByRole('button', { name: 'Página 1, actual' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Ir a la página 10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ir a la página 5' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ir a la página 4' }));
    await waitFor(() =>
      expect(fetchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 4 }),
        expect.any(AbortSignal),
      ),
    );

    expect(await screen.findByRole('button', { name: 'Página 4, actual' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Ir a la página 5' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ir a la página 2' })).not.toBeInTheDocument();
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

describe('buildPaginationItems', () => {
  it('conserva los extremos y limita a cinco números visibles', () => {
    expect(buildPaginationItems(1, 4)).toEqual([1, 2, 3, 4]);
    expect(buildPaginationItems(1, 10)).toEqual([1, 2, 3, 4, 'end-ellipsis', 10]);
    expect(buildPaginationItems(5, 10)).toEqual([1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 10]);
    expect(buildPaginationItems(10, 10)).toEqual([1, 'start-ellipsis', 7, 8, 9, 10]);
  });
});
