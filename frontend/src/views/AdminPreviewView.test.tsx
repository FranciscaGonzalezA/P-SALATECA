import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AdminPreviewView } from './AdminPreviewView';

describe('AdminPreviewView', () => {
  it('simula crear, editar y eliminar publicaciones sin usar la API', async () => {
    render(<AdminPreviewView />);
    expect(screen.getByText('Vista de demostración')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Título'), 'Nueva historia');
    await userEvent.type(screen.getByLabelText('Cuerpo'), 'Contenido de prueba');
    await userEvent.click(screen.getByRole('button', { name: 'Crear publicación' }));
    expect(await screen.findByText('Publicación de demostración creada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva historia' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Nueva historia' }));
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.type(screen.getByLabelText('Título'), 'Historia actualizada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByRole('button', { name: 'Historia actualizada' })).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await userEvent.click(deleteButtons.at(-1)!);
    expect(screen.queryByRole('button', { name: 'Historia actualizada' })).not.toBeInTheDocument();
  });
});
