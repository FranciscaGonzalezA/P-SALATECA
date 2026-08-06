import type { AdminPostInputDto, AuthenticatedUserDto, PostSummaryDto } from '@salateca/contracts';
import { useEffect, useState, type FormEvent } from 'react';
import { createAdminPost, deleteAdminPost, updateAdminPost } from '../api/adminPostsApi';
import { fetchPost, fetchPosts } from '../api/postsApi';

interface AdminViewProps {
  user: AuthenticatedUserDto;
  onLogout: () => Promise<void>;
}

const emptyPost: AdminPostInputDto = {
  title: '',
  body: '',
  imageUrl: null,
  sourceName: 'Salateca de Cine',
  sourceUrl: '',
  keywords: [],
};

export function AdminView({ user, onLogout }: AdminViewProps) {
  const [posts, setPosts] = useState<PostSummaryDto[]>([]);
  const [form, setForm] = useState<AdminPostInputDto>(emptyPost);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keywordsText, setKeywordsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = async () => {
    setPosts(await fetchPosts());
  };

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .catch((requestError: unknown) =>
        setError(
          requestError instanceof Error ? requestError.message : 'No fue posible cargar los posts.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const startNew = () => {
    setEditingId(null);
    setForm(emptyPost);
    setKeywordsText('');
    setMessage(null);
    setError(null);
  };

  const startEditing = async (postId: number) => {
    setError(null);
    try {
      const post = await fetchPost(postId);
      setEditingId(post.id);
      setForm({
        title: post.title,
        body: post.body,
        imageUrl: post.imageUrl,
        sourceName: post.sourceName,
        sourceUrl: post.sourceUrl,
        keywords: post.keywords,
      });
      setKeywordsText(post.keywords.join(', '));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No fue posible abrir el post.',
      );
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const input = {
        ...form,
        keywords: keywordsText
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };
      const saved = editingId
        ? await updateAdminPost(editingId, input)
        : await createAdminPost(input);
      setEditingId(saved.id);
      setMessage(editingId ? 'Publicación actualizada.' : 'Publicación creada.');
      await loadPosts();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No fue posible guardar el post.',
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (postId: number, title: string) => {
    if (!window.confirm(`¿Eliminar “${title}”? Esta acción no se puede deshacer.`)) return;
    setError(null);
    try {
      await deleteAdminPost(postId);
      if (editingId === postId) startNew();
      setMessage('Publicación eliminada.');
      await loadPosts();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No fue posible eliminar el post.',
      );
    }
  };

  return (
    <section className="admin-page page-section">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">Panel administrativo</p>
          <h1>Publicaciones</h1>
          <p>Sesión iniciada como {user.email}</p>
        </div>
        <button type="button" className="outline-button" onClick={() => void onLogout()}>
          Cerrar sesión
        </button>
      </header>

      {error && (
        <div role="alert" className="admin-message is-error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="admin-message">
          {message}
        </div>
      )}

      <div className="admin-layout">
        <aside className="admin-post-list" aria-label="Publicaciones existentes">
          <button type="button" className="admin-new-button" onClick={startNew}>
            + Nueva publicación
          </button>
          {loading ? (
            <p>Cargando publicaciones…</p>
          ) : (
            posts.map((post) => (
              <article key={post.id} className={editingId === post.id ? 'is-current' : ''}>
                <button type="button" onClick={() => void startEditing(post.id)}>
                  {post.title}
                </button>
                <button
                  type="button"
                  className="admin-delete"
                  onClick={() => void remove(post.id, post.title)}
                >
                  Eliminar
                </button>
              </article>
            ))
          )}
        </aside>

        <form className="admin-post-form" onSubmit={submit}>
          <h2>{editingId ? 'Editar publicación' : 'Nueva publicación'}</h2>
          <label>
            Título
            <input
              required
              minLength={3}
              maxLength={500}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            Cuerpo
            <textarea
              required
              rows={12}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </label>
          <label>
            URL de imagen (opcional)
            <input
              type="url"
              value={form.imageUrl ?? ''}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value || null })}
            />
          </label>
          <div className="admin-form-row">
            <label>
              Nombre de la fuente
              <input
                required
                value={form.sourceName}
                onChange={(event) => setForm({ ...form, sourceName: event.target.value })}
              />
            </label>
            <label>
              URL de la fuente
              <input
                required
                type="url"
                value={form.sourceUrl}
                onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
              />
            </label>
          </div>
          <label>
            Palabras clave (separadas por coma)
            <input value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear publicación'}
          </button>
        </form>
      </div>
    </section>
  );
}
