import type { PostDetailDto } from '@salateca/contracts';
import { useEffect, useState } from 'react';
import { fetchPost } from '../api/postsApi';

interface PostDetailViewProps {
  postId: number;
  onBack: () => void;
}

export function PostDetailView({ postId, onBack }: PostDetailViewProps) {
  const [post, setPost] = useState<PostDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPost(postId, controller.signal)
      .then(setPost)
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(requestError instanceof Error ? requestError.message : 'Post no disponible.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [postId]);

  if (loading) {
    return <div className="detail-loading page-section">Cargando lectura…</div>;
  }

  if (error || !post) {
    return (
      <div className="state-card detail-error page-section">
        <h1>No encontramos este post</h1>
        <p>{error ?? 'La publicación solicitada no está disponible.'}</p>
        <button type="button" onClick={onBack}>
          Volver a posts
        </button>
      </div>
    );
  }

  const paragraphs = post.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="post-detail page-section">
      <button type="button" className="back-button" onClick={onBack}>
        ← Volver a posts
      </button>

      <header className="post-detail-heading">
        <p className="eyebrow">Lecturas Salateca</p>
        <h1>{post.title}</h1>
        <div className="post-keywords" aria-label="Palabras clave">
          {post.keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      </header>

      <figure className={`post-hero-media ${post.imageUrl ? '' : 'is-placeholder'}`}>
        {post.imageUrl ? (
          <img src={post.imageUrl} alt={`Imagen principal de ${post.title}`} />
        ) : (
          <div>
            <span>Salateca</span>
            <strong>Imagen, memoria y territorio</strong>
          </div>
        )}
      </figure>

      <div className="post-reading-layout">
        <aside className="post-source-note">
          <span>Publicado por</span>
          <strong>{post.sourceName}</strong>
          <time dateTime={post.updatedAt}>
            Actualizado el {new Date(post.updatedAt).toLocaleDateString('es-CL')}
          </time>
          <a href={post.sourceUrl} target="_blank" rel="noreferrer">
            Ver publicación original ↗
          </a>
        </aside>

        <section className="post-body" aria-label="Contenido del post">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </section>
      </div>
    </article>
  );
}
