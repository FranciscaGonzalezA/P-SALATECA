import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordView } from './ForgotPasswordView';
import { ResetPasswordView } from './ResetPasswordView';

const { requestPasswordReset, resetPassword } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock('../api/authApi', () => ({ requestPasswordReset, resetPassword }));

describe('recuperación de contraseña', () => {
  beforeEach(() => {
    requestPasswordReset.mockReset();
    resetPassword.mockReset();
  });

  it('solicita un enlace con el correo administrador', async () => {
    requestPasswordReset.mockResolvedValue('Si la cuenta existe, recibirás un enlace.');
    render(<ForgotPasswordView onBack={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'admin@salateca.cl');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(requestPasswordReset).toHaveBeenCalledWith('admin@salateca.cl');
    expect(await screen.findByRole('status')).toHaveTextContent('recibirás un enlace');
  });

  it('valida y guarda una contraseña nueva', async () => {
    resetPassword.mockResolvedValue('Contraseña actualizada.');
    render(<ResetPasswordView token="token-seguro" onBack={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-segura');
    await userEvent.type(screen.getByLabelText('Repite la contraseña'), 'nueva-clave-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(resetPassword).toHaveBeenCalledWith(
      'token-seguro',
      'nueva-clave-segura',
      'nueva-clave-segura',
    );
    expect(await screen.findByRole('status')).toHaveTextContent('actualizada');
  });

  it('detecta enlaces incompletos', () => {
    render(<ResetPasswordView token={undefined} onBack={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('incompleto');
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
  });

  it('detecta contraseñas diferentes', async () => {
    render(<ResetPasswordView token="token-seguro" onBack={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-segura');
    await userEvent.type(screen.getByLabelText('Repite la contraseña'), 'otra-clave-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(screen.getByRole('alert')).toHaveTextContent('no coinciden');
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
