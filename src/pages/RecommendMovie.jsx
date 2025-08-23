import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './recomendacionMovie.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RecommendMovie = () => {
  const [recommendedMovie, setRecommendedMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    document.body.classList.toggle('menu-open');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.classList.remove('menu-open');
  };

  const navigateToPage = (path) => {
    closeMobileMenu();
    navigate(path);
  };

  useEffect(() => {
    const fetchRandomPendingMovie = async () => {
      try {
        // Obtener todas las películas
        const res = await fetch(`${API_URL}/api/movies`);
        const data = await res.json();
        
        // Filtrar solo las películas pendientes
        const pendingMovies = Array.isArray(data) 
          ? data.filter(movie => movie.status === 'pendiente')
          : [];

        if (pendingMovies.length === 0) {
          setLoading(false);
          return;
        }

        // Seleccionar una película aleatoria
        const randomIndex = Math.floor(Math.random() * pendingMovies.length);
        const randomMovie = pendingMovies[randomIndex];
        
        setRecommendedMovie(randomMovie);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar las películas:', error);
        setLoading(false);
      }
    };

    fetchRandomPendingMovie();
  }, []); // Se ejecuta solo al montar el componente

  if (loading) {
    return (
      <div className="recommend-page">
        {/* Header de navegación fijo */}
        <header className="main-header">
          <div className="header-container">
            <div className="brand">
              <h1 className="brand-title">Mi Bitácora</h1>
            </div>
            
            {/* Navegación desktop */}
            <nav className="desktop-navigation">
              <button 
                className="nav-link" 
                onClick={() => navigate('/')}
              >
                Inicio
              </button>
              <button 
                className="nav-link active" 
                onClick={() => navigate('/recomendacion')}
              >
                Recomendación
              </button>
              <button 
                className="nav-link" 
                onClick={() => navigate('/actualizacion')}
              >
                Actualización
              </button>
            </nav>
            
            {/* Botón hamburguesa móvil */}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
              <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </header>

        {/* Sidebar móvil */}
        {isMobileMenuOpen && (
          <>
            <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
            <div className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
              <div className="sidebar-header">
                <h2 className="sidebar-brand">Mi Bitácora</h2>
                <button className="sidebar-close" onClick={closeMobileMenu}>×</button>
              </div>
              <nav className="sidebar-menu">
                <button className="sidebar-link" onClick={() => navigateToPage('/')}>
                  Inicio
                </button>
                <button className="sidebar-link" onClick={() => navigateToPage('/recomendacion')}>
                  Recomendación
                </button>
                <button className="sidebar-link" onClick={() => navigateToPage('/actualizacion')}>
                  Actualización
                </button>
              </nav>
            </div>
          </>
        )}
        
        <div className="loading">Buscando una película para recomendarte...</div>
      </div>
    );
  }

  if (!recommendedMovie) {
    return (
      <div className="recommend-page">
        {/* Header de navegación fijo */}
        <header className="main-header">
          <div className="header-container">
            <div className="brand">
              <h1 className="brand-title">Mi Bitácora</h1>
            </div>
            
            {/* Navegación desktop */}
            <nav className="desktop-navigation">
              <button 
                className="nav-link" 
                onClick={() => navigate('/')}
              >
                Inicio
              </button>
              <button 
                className="nav-link active" 
                onClick={() => navigate('/recomendacion')}
              >
                Recomendación
              </button>
              <button 
                className="nav-link" 
                onClick={() => navigate('/actualizacion')}
              >
                Actualización
              </button>
            </nav>
            
            {/* Botón hamburguesa móvil */}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
              <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </header>

        {/* Sidebar móvil */}
        {isMobileMenuOpen && (
          <>
            <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
            <div className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
              <div className="sidebar-header">
                <h2 className="sidebar-brand">Mi Bitácora</h2>
                <button className="sidebar-close" onClick={closeMobileMenu}>×</button>
              </div>
              <nav className="sidebar-menu">
                <button className="sidebar-link" onClick={() => navigateToPage('/')}>
                  Inicio
                </button>
                <button className="sidebar-link" onClick={() => navigateToPage('/recomendacion')}>
                  Recomendación
                </button>
                <button className="sidebar-link" onClick={() => navigateToPage('/actualizacion')}>
                  Actualización
                </button>
              </nav>
            </div>
          </>
        )}

        {/* Banner */}
        <div className="site-banner"></div>

        {/* Título y fecha */}
        <div className="site-header">
          <div className="header-content">
            <div className="title-block">
              <div className="site-title">Mi registro personal de películas</div>
            </div>
            <div className="meta">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>

        <div className="no-movies">
          <h2>No hay películas pendientes</h2>
          <p>Agrega algunas películas a tu lista de pendientes para recibir recomendaciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-page">
      {/* Header de navegación fijo */}
      <header className="main-header">
        <div className="header-container">
          <div className="brand">
            <h1 className="brand-title">Mi Bitácora</h1>
          </div>
          
          {/* Navegación desktop */}
          <nav className="desktop-navigation">
            <button 
              className="nav-link" 
              onClick={() => navigate('/')}
            >
              Inicio
            </button>
            <button 
              className="nav-link active" 
              onClick={() => navigate('/recomendacion')}
            >
              Recomendación
            </button>
            <button 
              className="nav-link" 
              onClick={() => navigate('/actualizacion')}
            >
              Actualización
            </button>
          </nav>
          
          {/* Botón hamburguesa móvil */}
          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </header>

      {/* Sidebar móvil */}
      {isMobileMenuOpen && (
        <>
          <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
          <div className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <h2 className="sidebar-brand">Mi Bitácora</h2>
              <button className="sidebar-close" onClick={closeMobileMenu}>×</button>
            </div>
            <nav className="sidebar-menu">
              <button className="sidebar-link" onClick={() => navigateToPage('/')}>
                Inicio
              </button>
              <button className="sidebar-link" onClick={() => navigateToPage('/recomendacion')}>
                Recomendación
              </button>
              <button className="sidebar-link" onClick={() => navigateToPage('/actualizacion')}>
                Actualización
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Banner */}
      <div className="site-banner"></div>

      {/* Título y fecha */}
      <div className="site-header">
        <div className="header-content">
          <div className="title-block">
            <div className="site-title">Mi registro personal de películas</div>
          </div>
          <div className="meta">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      <div className="movie-card">
        <h1 className="recommend-title">Te recomendamos ver:</h1>
        
        <div className="movie-header">
          <img 
            className="movie-poster"
            src={recommendedMovie.poster_url || ''} 
            alt={recommendedMovie.title} 
          />
          
          <div className="movie-title-section">
            <h2 className="movie-title">
              {recommendedMovie.title}
            </h2>
            <span className="movie-year">({recommendedMovie.year})</span>
          </div>
        </div>
        
        <div className="movie-content">
          <div className="movie-details">
            {recommendedMovie.director && (
              <div className="meta-info">
                <strong>Director:</strong> {recommendedMovie.director}
              </div>
            )}
            
            {recommendedMovie.actors && (
              <div className="meta-info">
                <strong>Reparto:</strong> {recommendedMovie.actors}
              </div>
            )}

            {recommendedMovie.country && (
              <div className="meta-info">
                <strong>País:</strong> {recommendedMovie.country}
              </div>
            )}
          </div>

          {recommendedMovie.overview && (
            <div className="synopsis">
              {recommendedMovie.overview}
            </div>
          )}

          <div className="action-buttons">
            <button 
              className="btn-primary" 
              onClick={() => navigate('/edit', { state: { movie: { ...recommendedMovie, _isDb: true } } })}
            >
              Editar estado
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => window.location.reload()}
            >
              Otra recomendación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendMovie;
