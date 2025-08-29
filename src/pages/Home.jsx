import React from 'react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <div className="site-header">
        <div className="header-content">
          <div className="title-block">
            <div className="site-title">Mi registro personal de películas</div>
            <div className="site-subtitle">Página de inicio - verificación visual</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', marginTop: '1rem' }}>
        <p style={{ color: 'var(--muted)' }}>Contenido de prueba para validar visibilidad en la página Inicio.</p>
        <div style={{ marginTop: 12 }}>
          <button className="btn">Botón de prueba</button>
        </div>
      </div>
    </div>
  );
};

export default Home;




