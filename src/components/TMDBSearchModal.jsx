import React, { useState, useEffect } from 'react';
import './TMDBSearchModal.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';
const FALLBACK = 'https://placehold.co/200x300/222/fff?text=Sin+Imagen';

export default function TMDBSearchModal({ isOpen, onClose, searchQuery, onSelect, currentMovie }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(searchQuery || '');

  useEffect(() => {
    if (isOpen && searchQuery) {
      setQuery(searchQuery);
      handleSearch(searchQuery);
    }
  }, [isOpen, searchQuery]);

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=es-MX&page=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error en TMDB API');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Error buscando en TMDB:', err);
      setError('Error al buscar películas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = async (movie) => {
    setLoading(true);
    try {
      // Obtener detalles completos
      const detailUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=credits`;
      const res = await fetch(detailUrl);
      if (!res.ok) throw new Error('Error obteniendo detalles');
      const data = await res.json();

      // Mapear datos igual que en la función original
      const director = data.credits?.crew?.find(p => p.job === 'Director')?.name || '';
      const cast = data.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '';
      const country = data.production_countries?.[0]?.name || '';
      const genres = data.genres?.map(g => g.name).join(', ') || '';

      const completeMovieData = {
        // Mantener campos originales del currentMovie
        ...currentMovie,
        // Actualizar con datos de TMDB
        tmdbid: data.id, // ✅ TMDB ID correcto
        title: data.title || currentMovie.title,
        year: data.release_date?.split('-')[0] || currentMovie.year,
        poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : currentMovie.poster_url,
        overview: data.overview || currentMovie.overview,
        director: director || currentMovie.director,
        actors: cast || currentMovie.actors,
        country: country || currentMovie.country,
        genres: genres || currentMovie.genres,
        media_type: 'Película'
      };

      console.log('🎯 Película seleccionada desde TMDB:', completeMovieData);
      onSelect(completeMovieData);
      onClose();
    } catch (err) {
      console.error('Error obteniendo detalles:', err);
      setError('Error al obtener detalles de la película');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tmdb-modal-overlay" onClick={onClose}>
      <div className="tmdb-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tmdb-modal-header">
          <h3>🔍 Buscar en TMDB: "{currentMovie?.title}"</h3>
          <button className="tmdb-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tmdb-search-bar">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Modificar búsqueda si es necesario..."
          />
          <button onClick={() => handleSearch(query)} disabled={loading}>
            🔍 Buscar
          </button>
        </div>

        <div className="tmdb-modal-body">
          {loading && <div className="tmdb-loading">🔄 Buscando en TMDB...</div>}
          {error && <div className="tmdb-error">❌ {error}</div>}
          
          {!loading && results.length === 0 && query && (
            <div className="tmdb-no-results">❌ No se encontraron resultados para "{query}"</div>
          )}

          <div className="tmdb-results-grid">
            {results.map(movie => (
              <div key={movie.id} className="tmdb-result-card">
                <img 
                  src={movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : FALLBACK}
                  alt={movie.title}
                  className="tmdb-result-poster"
                />
                <div className="tmdb-result-info">
                  <h4>{movie.title}</h4>
                  <p className="tmdb-result-year">
                    📅 {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Sin fecha'}
                  </p>
                  <p className="tmdb-result-overview">
                    {movie.overview ? (movie.overview.length > 100 ? movie.overview.slice(0, 100) + '...' : movie.overview) : 'Sin sinopsis disponible'}
                  </p>
                  <div className="tmdb-result-meta">
                    <span>⭐ {movie.vote_average?.toFixed(1) || 'N/A'}</span>
                    <span>🆔 {movie.id}</span>
                  </div>
                  <button 
                    className="tmdb-select-btn"
                    onClick={() => handleSelectMovie(movie)}
                    disabled={loading}
                  >
                    ✅ Seleccionar Esta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
