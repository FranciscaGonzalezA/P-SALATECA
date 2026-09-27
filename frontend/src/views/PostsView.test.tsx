import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostsView } from './PostsView';

const { fetchPosts } = vi.hoisted(() => ({ fetchPosts: vi.fn() }));
vi.mock('../api/postsApi', () => ({ fetchPosts }));

describe('PostsView', () => {
  beforeEach(() => {
    fetchPosts.mockReset().mockResolvedValue([
      {
        id: 4,
        title: 'Cine insurgente',
        imageUrl: null,
        keywords: ['memoria', 'cine documental'],
      },
    ]);
  });

  it('presenta los títulos y permite seleccionar un post', async () => {
    const onPost = vi.fn();
    render(<PostsView onPost={onPost} />);

    await userEvent.click(await screen.findByRole('button', { name: /Cine insurgente/ }));
    expect(onPost).toHaveBeenCalledWith(4);
    expect(screen.getByText(/memoria · cine documental/i)).toBeInTheDocument();
  });

  it('muestra el error de carga', async () => {
    fetchPosts.mockRejectedValueOnce(new Error('Sin conexión'));
    render(<PostsView onPost={() => undefined} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });
});
