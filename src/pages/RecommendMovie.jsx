import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecommendMovie.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';

const RecommendMovie = () => {
  const [recommendedMovie, setRecommendedMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRandomPendingMovie = async () => {
      try {
        // Obtener todas las películas
        const res = await fetch('http://localhost:3000/api/movies');
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
        <div className="loading">Buscando una película para recomendarte...</div>
      </div>
    );
  }

  if (!recommendedMovie) {
    return (
      <div className="recommend-page">
        <div className="nav-buttons">
          <button 
            className="btn-nav" 
            onClick={() => navigate('/')}
          >
            Inicio
          </button>
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
      <div className="nav-buttons">
        <button 
          className="btn-nav" 
          onClick={() => navigate('/')}
        >
          Inicio
        </button>
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
