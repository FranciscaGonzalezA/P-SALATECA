import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminView } from './AdminView';

const api = vi.hoisted(() => ({
  fetchPosts: vi.fn(),
  fetchPost: vi.fn(),
  createAdminPost: vi.fn(),
  updateAdminPost: vi.fn(),
  moveAdminPost: vi.fn(),
  deleteAdminPost: vi.fn(),
}));
vi.mock('../api/postsApi', () => ({ fetchPosts: api.fetchPosts, fetchPost: api.fetchPost }));
vi.mock('../api/adminPostsApi', () => ({
  createAdminPost: api.createAdminPost,
  updateAdminPost: api.updateAdminPost,
  moveAdminPost: api.moveAdminPost,
  deleteAdminPost: api.deleteAdminPost,
}));

const user = { id: 1, email: 'admin@salateca.cl', role: 'admin' as const };
const post = {
  id: 4,
  title: 'Post existente',
  body: 'Contenido existente',
  imageUrl: null,
  sourceName: 'Salateca',
  sourceUrl: 'https://example.com/post',
  keywords: ['cine'],
  createdAt: '',
  updatedAt: '',
};

describe('AdminView', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.fetchPosts.mockResolvedValue([
      { id: post.id, title: post.title, imageUrl: null, keywords: ['cine'] },
    ]);
    api.fetchPost.mockResolvedValue(post);
    api.createAdminPost.mockResolvedValue(post);
    api.updateAdminPost.mockResolvedValue(post);
    api.moveAdminPost.mockResolvedValue(true);
    api.deleteAdminPost.mockResolvedValue(undefined);
  });

  it('crea una publicación y permite cerrar sesión', async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);
    render(<AdminView user={user} onLogout={onLogout} />);
    await screen.findByText('Post existente');

    await userEvent.type(screen.getByLabelText('Título'), 'Nueva publicación');
    await userEvent.type(screen.getByLabelText('Cuerpo'), 'Nuevo contenido');
    await userEvent.type(screen.getByLabelText('URL de la fuente'), 'https://example.com/nuevo');
    await userEvent.type(screen.getByLabelText(/Palabras clave/), 'cine, memoria');
    await userEvent.click(screen.getByRole('button', { name: 'Crear publicación' }));

    expect(api.createAdminPost).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nueva publicación',
        keywords: ['cine', 'memoria'],
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('creada');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('edita y elimina una publicación existente', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    render(<AdminView user={user} onLogout={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: post.title }));
    expect(await screen.findByDisplayValue(post.body)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.type(screen.getByLabelText('Título'), 'Título actualizado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(api.updateAdminPost).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ title: 'Título actualizado' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(api.deleteAdminPost).toHaveBeenCalledWith(4);
    expect(await screen.findByRole('status')).toHaveTextContent('eliminada');
  });

  it('permite subir y bajar publicaciones y deshabilita los extremos', async () => {
    const secondPost = { id: 5, title: 'Segundo post', imageUrl: null, keywords: [] };
    api.fetchPosts
      .mockResolvedValueOnce([
        { id: post.id, title: post.title, imageUrl: null, keywords: ['cine'] },
        secondPost,
      ])
      .mockResolvedValueOnce([
        secondPost,
        { id: post.id, title: post.title, imageUrl: null, keywords: ['cine'] },
      ]);

    render(<AdminView user={user} onLogout={vi.fn()} />);
    expect(await screen.findByRole('button', { name: `Subir ${post.title}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `Bajar ${secondPost.title}` })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: `Subir ${secondPost.title}` }));

    expect(api.moveAdminPost).toHaveBeenCalledWith(5, 'up');
    expect(await screen.findByRole('status')).toHaveTextContent('movida hacia arriba');
    expect(screen.getByRole('button', { name: `Subir ${secondPost.title}` })).toBeDisabled();
  });
});
