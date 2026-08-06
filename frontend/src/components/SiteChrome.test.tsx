import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SiteChrome } from './SiteChrome';

describe('SiteChrome', () => {
  it('navega desde el menú y lo cierra después de elegir una ruta', async () => {
    const onNavigate = vi.fn();
    render(
      <SiteChrome currentRoute="home" onNavigate={onNavigate}>
        <h1>Contenido</h1>
      </SiteChrome>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(navigation).toHaveAttribute('aria-hidden', 'false');

    await userEvent.click(within(navigation).getByRole('button', { name: 'Cartelera' }));
    expect(onNavigate).toHaveBeenCalledWith('catalog');
    expect(navigation).toHaveAttribute('aria-hidden', 'true');
  });

  it('persiste contraste y limita la escala tipográfica', async () => {
    const user = userEvent.setup();
    render(
      <SiteChrome currentRoute="catalog" onNavigate={() => undefined}>
        Contenido
      </SiteChrome>,
    );

    const contrast = screen.getByRole('button', { name: 'Alto contraste' });
    await user.click(contrast);
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(localStorage.getItem('salateca-contrast')).toBe('high');

    const increase = screen.getByRole('button', { name: 'Aumentar tamaño del texto' });
    await user.click(increase);
    await user.click(increase);
    await user.click(increase);
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.2');

    await user.click(screen.getByRole('button', { name: 'Restablecer tamaño del texto' }));
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Reducir tamaño del texto' }));
    await user.click(screen.getByRole('button', { name: 'Reducir tamaño del texto' }));
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('0.9');
  });

  it('sanea una preferencia tipográfica persistida inválida', () => {
    localStorage.setItem('salateca-font-scale', 'no-numérico');
    render(
      <SiteChrome currentRoute="home" onNavigate={() => undefined}>
        Contenido
      </SiteChrome>,
    );

    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1');
    expect(localStorage.getItem('salateca-font-scale')).toBe('0');
  });

  it('conecta accesos de cabecera, barra lateral y fondo del menú', async () => {
    const onNavigate = vi.fn();
    render(
      <SiteChrome currentRoute="catalog" onNavigate={onNavigate}>
        Contenido
      </SiteChrome>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Salateca.*de cine/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver cartelera' }));

    const shortcuts = screen.getByRole('complementary', { name: 'Accesos rápidos' });
    await userEvent.click(within(shortcuts).getByRole('button', { name: 'Inicio' }));
    expect(onNavigate.mock.calls.map(([route]) => route)).toEqual(['home', 'catalog', 'home']);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const navigation = document.querySelector<HTMLElement>('.mobile-menu');
    const backdrop = document.querySelector<HTMLButtonElement>('.menu-backdrop');
    expect(navigation).not.toBeNull();
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop!);
    expect(navigation).toHaveAttribute('aria-hidden', 'true');
  });
});
