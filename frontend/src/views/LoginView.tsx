import { useState, type FormEvent } from 'react';
import type { AuthenticatedUserDto } from '@salateca/contracts';
import { login, logout } from '../api/authApi';

interface LoginViewProps {
  onAuthenticated: (user: AuthenticatedUserDto) => void;
  onPreview?: () => void;
  onForgotPassword?: () => void;
}

export function LoginView({ onAuthenticated, onPreview, onForgotPassword }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        await logout();
        setError('Esta cuenta no tiene acceso al panel administrativo.');
        return;
      }
      onAuthenticated(user);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No fue posible iniciar sesión.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-login page-section">
      <form className="admin-login-card" onSubmit={submit}>
        <p className="eyebrow">Acceso restringido</p>
        <h1>Administración</h1>
        <p>Ingresa con la cuenta administradora configurada para Salateca.</p>
        {error && (
          <div role="alert" className="admin-message is-error">
            {error}
          </div>
        )}
        <label>
          Correo electrónico
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
        {onForgotPassword && (
          <button type="button" className="admin-text-button" onClick={onForgotPassword}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {onPreview && (
          <button type="button" className="admin-preview-button" onClick={onPreview}>
            Ver demostración sin iniciar sesión
          </button>
        )}
      </form>
    </section>
  );
}
