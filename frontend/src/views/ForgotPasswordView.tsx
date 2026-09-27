import { useState, type FormEvent } from 'react';
import { requestPasswordReset } from '../api/authApi';

interface ForgotPasswordViewProps {
  onBack: () => void;
}

export function ForgotPasswordView({ onBack }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      setMessage(await requestPasswordReset(email));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible solicitar la recuperación.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-login page-section">
      <form className="admin-login-card" onSubmit={submit}>
        <p className="eyebrow">Recuperación de acceso</p>
        <h1>Restablecer contraseña</h1>
        <p>
          Ingresa el correo de la cuenta administradora. Si existe, enviaremos un enlace temporal.
        </p>
        {message && (
          <div role="status" className="admin-message">
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="admin-message is-error">
            {error}
          </div>
        )}
        <label>
          Correo electrónico
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <button type="button" className="admin-text-button" onClick={onBack}>
          Volver al inicio de sesión
        </button>
      </form>
    </section>
  );
}
