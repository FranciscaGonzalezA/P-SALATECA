const plannedCapabilities = [
  'Cartelera filtrable por fecha, sala, horario y género',
  'Detalle de películas y funciones con fuente oficial',
  'Datos normalizados de salas y cargas externas',
];

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#main-content" aria-label="Cine Arte, ir al contenido">
          Cine Arte
        </a>
        <span className="phase-label">Base técnica · Etapa 1</span>
      </header>

      <main id="main-content" className="hero">
        <p className="eyebrow">Cartelera cultural local</p>
        <h1>Todo el cine arte, en un solo lugar.</h1>
        <p className="hero-copy">
          Estamos preparando una plataforma accesible para descubrir películas, horarios y salas
          independientes desde una cartelera centralizada.
        </p>

        <section className="status-card" aria-labelledby="status-title">
          <div>
            <p className="status-kicker">Estado del proyecto</p>
            <h2 id="status-title">Arquitectura inicial configurada</h2>
          </div>
          <ul>
            {plannedCapabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
