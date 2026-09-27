import { useState, type FormEvent } from 'react';
import { resetPassword } from '../api/authApi';

interface ResetPasswordViewProps {
  token: string | undefined;
  onBack: () => void;
}

export function ResetPasswordView({ token, onBack }: ResetPasswordViewProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : 'El enlace de recuperación está incompleto.',
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password, passwordConfirmation);
      setCompleted(true);
      setPassword('');
      setPasswordConfirmation('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible actualizar la contraseña.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-login page-section">
      <form className="admin-login-card" onSubmit={submit}>
        <p className="eyebrow">Recuperación de acceso</p>
        <h1>Nueva contraseña</h1>
        <p>Usa al menos 12 caracteres. El enlace funciona una sola vez.</p>
        {completed && (
          <div role="status" className="admin-message">
            Tu contraseña fue actualizada. Ya puedes iniciar sesión.
          </div>
        )}
        {error && (
          <div role="alert" className="admin-message is-error">
            {error}
          </div>
        )}
        {!completed && token && (
          <>
            <label>
              Nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Repite la contraseña
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                required
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Actualizando…' : 'Guardar contraseña'}
            </button>
          </>
        )}
        <button type="button" className="admin-text-button" onClick={onBack}>
          Volver al inicio de sesión
        </button>
      </form>
    </section>
  );
}
