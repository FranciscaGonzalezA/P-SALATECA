import type { PostSummaryDto } from '@salateca/contracts';
import { useEffect, useState } from 'react';
import { fetchPosts } from '../api/postsApi';

interface PostsViewProps {
  onPost: (postId: number) => void;
}

export function PostsView({ onPost }: PostsViewProps) {
  const [posts, setPosts] = useState<PostSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPosts(controller.signal)
      .then(setPosts)
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible cargar los posts.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="posts-page page-section">
      <header className="posts-heading">
        <p className="eyebrow">Archivo editorial</p>
        <h1>Ideas, memoria y cine</h1>
        <p>Reseñas, investigaciones y miradas sobre las imágenes que atraviesan nuestra cultura.</p>
      </header>

      {loading ? (
        <div className="posts-loading" aria-label="Cargando posts">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="state-card error-state" role="alert">
          <h2>No pudimos abrir el archivo editorial</h2>
          <p>{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="state-card">
          <h2>Aún no hay posts publicados</h2>
          <p>Las próximas historias aparecerán en esta sección.</p>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map((post, index) => (
            <button type="button" onClick={() => onPost(post.id)} key={post.id}>
              <span className="post-list-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="post-list-copy">
                <span className="post-list-kicker">
                  {post.keywords.slice(0, 3).join(' · ') || 'Salateca de Cine'}
                </span>
                <strong>{post.title}</strong>
              </span>
              <span className="post-list-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
