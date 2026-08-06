import { useState, type FormEvent } from 'react';
import { AdminScreeningsImport } from '../components/AdminScreeningsImport';

interface DemoPost {
  id: number;
  title: string;
  body: string;
  keywords: string;
}

const initialPosts: DemoPost[] = [
  {
    id: 1,
    title: 'Tres películas chilenas para volver a mirar',
    body: 'Una selección editorial de obras fundamentales y sus próximas funciones.',
    keywords: 'cine chileno, memoria',
  },
  {
    id: 2,
    title: 'Conversación con una sala independiente',
    body: 'Una entrevista sobre programación, públicos y espacios culturales.',
    keywords: 'salas, entrevista',
  },
];

const emptyPost = { title: '', body: '', keywords: '' };

const simulateExcelImport = async () => ({
  runId: 104,
  status: 'partially_succeeded' as const,
  processed: 18,
  inserted: 15,
  updated: 1,
  duplicates: 1,
  rejected: 1,
  errors: [
    {
      rowNumber: 12,
      field: 'Fecha texto',
      code: 'invalid_datetime',
      value: '31/02/2026 20:00',
      message: 'La fecha debe usar un día válido.',
    },
  ],
});

export function AdminPreviewView() {
  const [posts, setPosts] = useState(initialPosts);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [message, setMessage] = useState<string | null>(null);

  const startNew = () => {
    setEditingId(null);
    setForm(emptyPost);
    setMessage(null);
  };

  const edit = (post: DemoPost) => {
    setEditingId(post.id);
    setForm({ title: post.title, body: post.body, keywords: post.keywords });
    setMessage(null);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (editingId) {
      setPosts((current) =>
        current.map((post) => (post.id === editingId ? { ...post, ...form } : post)),
      );
      setMessage('Cambio simulado correctamente.');
      return;
    }

    const id = Math.max(0, ...posts.map((post) => post.id)) + 1;
    setPosts((current) => [...current, { id, ...form }]);
    setEditingId(id);
    setMessage('Publicación de demostración creada.');
  };

  const remove = (postId: number) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    if (editingId === postId) startNew();
    setMessage('Publicación retirada de la demostración.');
  };

  return (
    <section className="admin-page page-section">
      <div className="admin-demo-banner" role="status">
        <strong>Vista de demostración</strong>
        <span>Los cambios existen solo en esta pestaña y no se guardan en la base de datos.</span>
      </div>

      <header className="admin-heading">
        <div>
          <p className="eyebrow">Panel administrativo</p>
          <h1>Publicaciones</h1>
          <p>Así funcionaría la administración editorial de Salateca.</p>
        </div>
      </header>

      {message && (
        <div role="status" className="admin-message">
          {message}
        </div>
      )}

      <AdminScreeningsImport importer={simulateExcelImport} />

      <div className="admin-layout">
        <aside className="admin-post-list" aria-label="Publicaciones de demostración">
          <button type="button" className="admin-new-button" onClick={startNew}>
            + Nueva publicación
          </button>
          {posts.map((post) => (
            <article key={post.id} className={editingId === post.id ? 'is-current' : ''}>
              <button type="button" onClick={() => edit(post)}>
                {post.title}
              </button>
              <button type="button" className="admin-delete" onClick={() => remove(post.id)}>
                Eliminar
              </button>
            </article>
          ))}
        </aside>

        <form className="admin-post-form" onSubmit={save}>
          <h2>{editingId ? 'Editar publicación' : 'Nueva publicación'}</h2>
          <label>
            Título
            <input
              required
              minLength={3}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            Cuerpo
            <textarea
              required
              rows={10}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </label>
          <label>
            Palabras clave
            <input
              value={form.keywords}
              onChange={(event) => setForm({ ...form, keywords: event.target.value })}
              placeholder="cine, memoria, cartelera"
            />
          </label>
          <button type="submit">{editingId ? 'Guardar cambios' : 'Crear publicación'}</button>
        </form>
      </div>
    </section>
  );
}
