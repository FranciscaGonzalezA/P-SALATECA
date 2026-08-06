import { useEffect, useState, type ReactNode } from 'react';

export type AppRoute = 'home' | 'catalog' | 'posts' | 'admin';

interface SiteChromeProps {
  children: ReactNode;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isAdmin?: boolean;
}

const navigationItems: Array<{ route: AppRoute; symbol: string; label: string }> = [
  { route: 'home', symbol: '⌂', label: 'Inicio' },
  { route: 'catalog', symbol: '▤', label: 'Cartelera' },
  { route: 'posts', symbol: '✦', label: 'Posts' },
];

function readFontScale(): number {
  const value = Number(localStorage.getItem('salateca-font-scale') ?? 0);
  return Number.isFinite(value) ? Math.min(2, Math.max(-1, value)) : 0;
}

export function SiteChrome({
  children,
  currentRoute,
  onNavigate,
  isAdmin = false,
}: SiteChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem('salateca-contrast') === 'high',
  );
  const [fontScale, setFontScale] = useState(readFontScale);

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'standard';
    localStorage.setItem('salateca-contrast', highContrast ? 'high' : 'standard');
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(1 + fontScale * 0.1));
    localStorage.setItem('salateca-font-scale', String(fontScale));
  }, [fontScale]);

  const navigate = (route: AppRoute) => {
    setMenuOpen(false);
    onNavigate(route);
  };
  const visibleNavigationItems = isAdmin
    ? [...navigationItems, { route: 'admin' as const, symbol: '⚙', label: 'Administración' }]
    : navigationItems;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>

      <header className="site-header">
        <button className="menu-button" type="button" onClick={() => setMenuOpen(true)}>
          <span aria-hidden="true">☰</span>
          <span className="sr-only">Abrir menú</span>
        </button>
        <button className="brand-button" type="button" onClick={() => navigate('home')}>
          <span className="brand-name">Salateca</span>
          <span className="brand-subtitle">de cine</span>
        </button>
        <button className="catalog-shortcut" type="button" onClick={() => navigate('catalog')}>
          Ver cartelera
        </button>
      </header>

      <nav
        className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}
        aria-label="Navegación principal"
        aria-hidden={!menuOpen}
      >
        <button
          className="menu-close"
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        >
          ×
        </button>
        <p className="menu-eyebrow">Explora Salateca</p>
        {visibleNavigationItems.map((item) => (
          <button
            className={currentRoute === item.route ? 'is-current' : ''}
            type="button"
            onClick={() => navigate(item.route)}
            key={item.route}
          >
            <span aria-hidden="true">{item.symbol}</span>
            {item.label}
          </button>
        ))}
        <a href="#contacto" onClick={() => setMenuOpen(false)}>
          <span aria-hidden="true">✉</span>
          Contacto
        </a>
      </nav>
      {menuOpen && (
        <button
          className="menu-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className="side-rail" aria-label="Accesos rápidos">
        {visibleNavigationItems.map((item) => (
          <button
            className={currentRoute === item.route ? 'is-current' : ''}
            type="button"
            onClick={() => navigate(item.route)}
            aria-label={item.label}
            title={item.label}
            key={item.route}
          >
            <span aria-hidden="true">{item.symbol}</span>
          </button>
        ))}
        <a href="#destacados" aria-label="Destacados" title="Destacados">
          <span aria-hidden="true">◆</span>
        </a>
        <a href="#contacto" aria-label="Contacto" title="Contacto">
          <span aria-hidden="true">✉</span>
        </a>
      </aside>

      <main id="main-content">{children}</main>

      <section className="accessibility-bar" aria-label="Preferencias de accesibilidad">
        <button
          type="button"
          aria-pressed={highContrast}
          onClick={() => setHighContrast((current) => !current)}
        >
          {highContrast ? 'Contraste estándar' : 'Alto contraste'}
        </button>
        <div className="font-controls" aria-label="Tamaño del texto">
          <span>Texto</span>
          <button
            type="button"
            onClick={() => setFontScale((current) => Math.max(-1, current - 1))}
            aria-label="Reducir tamaño del texto"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => setFontScale(0)}
            aria-label="Restablecer tamaño del texto"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => setFontScale((current) => Math.min(2, current + 1))}
            aria-label="Aumentar tamaño del texto"
          >
            A+
          </button>
        </div>
      </section>

      <footer id="contacto" className="site-footer">
        <div>
          <span className="footer-brand">Salateca</span>
          <p>Cartelera independiente, reunida con trazabilidad y respeto por sus fuentes.</p>
        </div>
        <div>
          <p className="footer-title">Contacto</p>
          <a href="mailto:contacto@salateca.cl">contacto@salateca.cl</a>
          <p>Santiago, Chile</p>
        </div>
        <div>
          <p className="footer-title">Información</p>
          <p>Los horarios se confirman en el sitio oficial de cada sala.</p>
          <p>© 2026 Salateca</p>
        </div>
      </footer>
    </div>
  );
}
