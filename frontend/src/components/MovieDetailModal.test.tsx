import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MovieDetailModal } from './MovieDetailModal';

describe('MovieDetailModal', () => {
  it('bloquea el fondo, enfoca el cierre y responde a Escape', async () => {
    const onClose = vi.fn();
    render(
      <MovieDetailModal onClose={onClose}>
        <a href="https://example.com">Acción del detalle</a>
      </MovieDetailModal>,
    );

    const closeButton = screen.getByRole('button', { name: 'Cerrar detalle' });
    expect(screen.getByRole('dialog', { name: 'Detalle de la película' })).toBeInTheDocument();
    expect(closeButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
