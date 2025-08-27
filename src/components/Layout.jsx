import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import '../pages/Home.css';

const Layout = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const toggleMobileMenu = () => setMobileMenuOpen(v => !v);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const navigateToPage = (path) => { closeMobileMenu(); navigate(path); };

  return (
    <div className="home-page">
      <header className="main-header">
        <div className="header-container">
          <div className="brand">
            <h1 className="brand-title">🎬 Mi Bitácora</h1>
          </div>

          <nav className="desktop-navigation">
            <button className="nav-link" onClick={() => navigate('/')}>Inicio</button>
            <button className="nav-link" onClick={() => navigate('/recomendacion')}>Recomendación</button>
            <button className="nav-link" onClick={() => navigate('/actualizacion')}>Actualización</button>
          </nav>

          <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Abrir menú">
            <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
              <span></span><span></span><span></span>
            </div>
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <>
          <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
          <div className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <h2 className="sidebar-brand">🎬 Mi Bitácora</h2>
              <button className="sidebar-close" onClick={closeMobileMenu}>×</button>
            </div>
            <nav className="sidebar-menu">
              <button className="sidebar-link" onClick={() => navigateToPage('/')}>Inicio</button>
              <button className="sidebar-link" onClick={() => navigateToPage('/recomendacion')}>Recomendación</button>
              <button className="sidebar-link" onClick={() => navigateToPage('/actualizacion')}>Actualización</button>
            </nav>
          </div>
        </>
      )}

      <div className="site-banner" />

      <div className="site-header">
        <div className="header-content">
          <div className="title-block">
            <div className="site-title">Mi registro personal de películas</div>
          </div>
          <div className="meta">{fecha}</div>
        </div>
      </div>

      <main style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 1rem 2rem' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
