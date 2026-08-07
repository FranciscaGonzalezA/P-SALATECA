import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { demoMovies } from '../data/demoCatalog';
import { HomeView } from './HomeView';

describe('HomeView', () => {
  it('muestra hasta tres destacadas y conecta sus acciones', async () => {
    const onCatalog = vi.fn();
    const onMovie = vi.fn();
    render(<HomeView featured={demoMovies} onCatalog={onCatalog} onMovie={onMovie} />);

    expect(screen.getByText('RM')).toBeInTheDocument();
    expect(screen.queryByText('ÑUBLE')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ver .+ y sus funciones/ })).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Descubrir la cartelera' }));
    await userEvent.click(screen.getAllByRole('link', { name: /Ver .+ y sus funciones/ })[0]!);

    expect(onCatalog).toHaveBeenCalledOnce();
    expect(onMovie).toHaveBeenCalledWith(1);

    const newsletterForm = screen.getByLabelText('Correo electrónico').closest('form');
    expect(newsletterForm).not.toBeNull();
    fireEvent.submit(newsletterForm!);
  });
});
