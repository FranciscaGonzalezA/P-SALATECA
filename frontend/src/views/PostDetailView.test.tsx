import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostDetailView } from './PostDetailView';

const { fetchPost } = vi.hoisted(() => ({ fetchPost: vi.fn() }));
vi.mock('../api/postsApi', () => ({ fetchPost }));

const post = {
  id: 1,
  title: 'La vida que vendrá',
  body: 'Primer párrafo.\n\nSegundo párrafo.',
  imageUrl: 'https://example.com/post.jpg',
  keywords: ['memoria', 'cine chileno'],
  sourceName: 'Salateca de Cine',
  sourceUrl: 'https://salatecadecine.cl/post/',
  createdAt: '2026-08-06T12:00:00.000Z',
  updatedAt: '2026-08-06T12:00:00.000Z',
};

describe('PostDetailView', () => {
  beforeEach(() => fetchPost.mockReset().mockResolvedValue(post));

  it('renderiza título, keywords, cuerpo e imagen', async () => {
    const onBack = vi.fn();
    render(<PostDetailView postId={1} onBack={onBack} />);

    expect(await screen.findByRole('heading', { name: post.title })).toBeInTheDocument();
    expect(screen.getByText('memoria')).toBeInTheDocument();
    expect(screen.getByText('Primer párrafo.')).toBeInTheDocument();
    expect(screen.getByText('Segundo párrafo.')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', post.imageUrl);
    expect(screen.getByRole('link', { name: /publicación original/i })).toHaveAttribute(
      'href',
      post.sourceUrl,
    );

    await userEvent.click(screen.getByRole('button', { name: /Volver a posts/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('usa la composición alternativa cuando no hay imagen', async () => {
    fetchPost.mockResolvedValueOnce({ ...post, imageUrl: null });
    render(<PostDetailView postId={1} onBack={() => undefined} />);
    expect(await screen.findByText('Imagen, memoria y territorio')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
