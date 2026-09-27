import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginView } from './LoginView';

const { login, logout } = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn() }));
vi.mock('../api/authApi', () => ({ login, logout }));

describe('LoginView', () => {
  beforeEach(() => {
    login.mockReset();
    logout.mockReset().mockResolvedValue(undefined);
  });

  it('entrega la cuenta administradora después del login', async () => {
    const admin = { id: 1, email: 'admin@salateca.cl', role: 'admin' as const };
    const onAuthenticated = vi.fn();
    login.mockResolvedValue(admin);
    render(<LoginView onAuthenticated={onAuthenticated} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), admin.email);
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(login).toHaveBeenCalledWith(admin.email, 'clave-segura');
    expect(onAuthenticated).toHaveBeenCalledWith(admin);
  });

  it('permite entrar a la vista de demostración', async () => {
    const onPreview = vi.fn();
    render(<LoginView onAuthenticated={() => undefined} onPreview={onPreview} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver demostración sin iniciar sesión' }),
    );
    expect(onPreview).toHaveBeenCalled();
  });

  it('rechaza cuentas sin rol y muestra errores del servidor', async () => {
    login.mockResolvedValueOnce({ id: 2, email: 'user@salateca.cl', role: 'user' });
    render(<LoginView onAuthenticated={() => undefined} />);
    const email = screen.getByLabelText('Correo electrónico');
    const password = screen.getByLabelText('Contraseña');
    await userEvent.type(email, 'user@salateca.cl');
    await userEvent.type(password, 'clave');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene acceso');
    expect(logout).toHaveBeenCalled();

    login.mockRejectedValueOnce(new Error('Credenciales incorrectas'));
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas');
  });
});
