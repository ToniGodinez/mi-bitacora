import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecommendMovie.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RecommendMovie = () => {
  const [recommendedMovie, setRecommendedMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const navigate = useNavigate();

  const toggleSynopsis = () => {
    setIsSynopsisExpanded(!isSynopsisExpanded);
  };

  const isTextLong = (text) => {
    // Siempre retorna true si hay texto, para que siempre se pueda expandir/contraer
    return text && text.length > 0;
  };

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
    fetchRandomPendingMovie();
  }, []); // Se ejecuta solo al montar el componente

  const fetchRandomPendingMovie = async () => {
    try {
      setLoading(true);
      setIsSynopsisExpanded(false); // Reset synopsis state
      // Obtener todas las películas
      const res = await fetch(`${API_URL}/api/movies`);
      const data = await res.json();
      
      // Filtrar solo las películas pendientes
      const pendingMovies = Array.isArray(data) 
        ? data.filter(movie => movie.status === 'pendiente')
        : [];

      if (pendingMovies.length === 0) {
        setRecommendedMovie(null);
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
      setRecommendedMovie(null);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="recommend-page">
        <div className="loading">Buscando una película para recomendarte...</div>
      </div>
    );
  }

  if (!recommendedMovie) {
    return (
      <div className="recommend-page">
        <div className="no-movies">
          <h2>No hay películas pendientes</h2>
          <p>Agrega algunas películas a tu lista de pendientes para recibir recomendaciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-page">
      <div className="movie-card">
        <div className="card-header">
          <h1 className="recommend-title">Te recomendamos ver:</h1>
        </div>
        <div className="card-content vertical">
          <div className="poster-section">
            <img 
              className="movie-poster"
              src={recommendedMovie.poster_url || ''} 
              alt={recommendedMovie.title} 
            />
          </div>
          <div className="movie-info">
            <div className="title-section">
              <h2 className="movie-title">{recommendedMovie.title}</h2>
              <span className="movie-year">({recommendedMovie.year})</span>
              <div className="stars">★★★★★</div>
            </div>
            <div className="movie-meta">
              {recommendedMovie.media_type && (
                <div className="meta-row">
                  <span className="meta-label">Tipo:</span> 
                  <span className="meta-value">{recommendedMovie.media_type}</span>
                </div>
              )}
              {recommendedMovie.status && (
                <div className="meta-row">
                  <span className="meta-label">Estado:</span> 
                  <span className="meta-value">{recommendedMovie.status}</span>
                </div>
              )}
              {recommendedMovie.director && (
                <div className="meta-row">
                  <span className="meta-label">Director:</span> 
                  <span className="meta-value">{recommendedMovie.director}</span>
                </div>
              )}
              {recommendedMovie.actors && (
                <div className="meta-row">
                  <span className="meta-label">Actores:</span> 
                  <span className="meta-value">{recommendedMovie.actors}</span>
                </div>
              )}
              {recommendedMovie.genres && (
                <div className="meta-row">
                  <span className="meta-label">Género:</span> 
                  <span className="meta-value">{recommendedMovie.genres}</span>
                </div>
              )}
            </div>
            {recommendedMovie.overview && (
              <div className="synopsis-section">
                <h3 className="synopsis-title">Sinopsis:</h3>
                <div className={`synopsis-content ${isSynopsisExpanded ? 'expanded' : ''}`}>
                  {recommendedMovie.overview}
                </div>
                {isTextLong(recommendedMovie.overview) && (
                  <button 
                    className="synopsis-toggle"
                    onClick={toggleSynopsis}
                  >
                    {isSynopsisExpanded ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            )}
            <div className="action-buttons">
              <button 
                className="btn-primary" 
                onClick={() => navigate('/edit', { state: { movie: { ...recommendedMovie, _isDb: true } } })}
              >
                Editar
              </button>
              <button 
                className="btn-secondary" 
                onClick={fetchRandomPendingMovie}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Otra'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendMovie;
