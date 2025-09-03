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
  
  // ✅ NUEVOS ESTADOS PARA BÚSQUEDA POR ID
  const [manualId, setManualId] = useState('');
  const [idLoading, setIdLoading] = useState(false);
  const [idError, setIdError] = useState(null);
  const [idResult, setIdResult] = useState(null);

  useEffect(() => {
    if (isOpen && searchQuery) {
      setQuery(searchQuery);
      handleSearch(searchQuery);
      // ✅ Limpiar resultados de ID al abrir
      setManualId('');
      setIdResult(null);
      setIdError(null);
    }
  }, [isOpen, searchQuery]);

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      // ✅ USAR BÚSQUEDA MULTI (películas, series, personas, etc.)
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=es-MX&page=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error en TMDB API');
      const data = await res.json();
      
      // ✅ FILTRAR SOLO PELÍCULAS Y SERIES (excluir personas)
      const filteredResults = (data.results || []).filter(item => 
        item.media_type === 'movie' || item.media_type === 'tv'
      ).map(item => {
        // ✅ NORMALIZAR CAMPOS PARA COMPATIBILIDAD
        if (item.media_type === 'tv') {
          item.title = item.name; // Series usan 'name'
          item.release_date = item.first_air_date; // Series usan 'first_air_date'
        }
        return item;
      });
      
      setResults(filteredResults);
    } catch (err) {
      console.error('Error buscando en TMDB:', err);
      setError('Error al buscar películas y series');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA BUSCAR POR ID (MULTI-TIPO: PELÍCULAS, SERIES, ETC.)
  const handleSearchById = async (tmdbId) => {
    if (!tmdbId.trim() || isNaN(tmdbId)) {
      setIdError('Por favor ingresa un ID válido (solo números)');
      return;
    }
    
    setIdLoading(true);
    setIdError(null);
    setIdResult(null);
    
    try {
      const endpoints = [
        { type: 'tv', label: 'Serie de TV', url: `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits` },
        { type: 'movie', label: 'Película', url: `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits` }
      ];
      
      let foundResults = [];
      
      // ✅ INTENTAR AMBOS TIPOS Y RECOPILAR RESULTADOS
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint.url);
          if (res.ok) {
            const data = await res.json();
            
            // ✅ NORMALIZAR CAMPOS SEGÚN EL TIPO
            if (endpoint.type === 'tv') {
              data.title = data.name; // Series usan 'name'
              data.release_date = data.first_air_date; // Series usan 'first_air_date'
            }
            
            data.media_type = endpoint.label; // Asignar tipo legible
            foundResults.push(data);
            console.log(`🎯 ${endpoint.label} encontrada con ID ${tmdbId}:`, data.title || data.name);
          }
        } catch (endpointErr) {
          console.log(`No se encontró como ${endpoint.label}:`, endpointErr.message);
          continue;
        }
      }
      
      if (foundResults.length === 0) {
        throw new Error('No se encontró ningún contenido (película, serie, etc.) con ese ID en TMDB');
      }
      
      // ✅ Si encontramos múltiples resultados, priorizar series de TV
      // ✅ Si solo encontramos uno, usar ese
      const finalResult = foundResults.find(r => r.media_type === 'Serie de TV') || foundResults[0];
      
      setIdResult(finalResult);
      console.log(`🎯 Resultado final seleccionado:`, finalResult);
      
    } catch (err) {
      console.error('Error buscando por ID:', err);
      setIdError(err.message || 'Error al buscar en TMDB');
    } finally {
      setIdLoading(false);
    }
  };

  const handleSelectMovie = async (movie) => {
    setLoading(true);
    try {
      // ✅ Si ya tenemos los detalles completos (desde búsqueda por ID), usarlos directamente
      let data = movie;
      
      // Si no tenemos credits, hacer fetch completo
      if (!movie.credits) {
        const detailUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits`;
        const res = await fetch(detailUrl);
        if (!res.ok) throw new Error('Error obteniendo detalles');
        data = await res.json();
      }

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
        media_type: data.media_type || (data.media_type === 'tv' ? 'Serie de TV' : 'Película') // ✅ Usar el tipo correcto
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
            placeholder="Buscar películas, series, documentales..."
          />
          <button onClick={() => handleSearch(query)} disabled={loading}>
            🔍 Buscar
          </button>
        </div>

        {/* ✅ NUEVA SECCIÓN PARA BÚSQUEDA POR ID */}
        <div className="tmdb-id-section">
          <div className="tmdb-id-header">
            <h4>🆔 ¿No encuentras el contenido? Búscalo por ID de TMDB</h4>
            <p>Si tienes el ID exacto de TMDB, ingrésalo aquí para obtener películas, series, documentales, etc. directamente</p>
          </div>
          <div className="tmdb-id-search">
            <input
              type="number"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchById(manualId)}
              placeholder="Ej: 79410 (After Life), 550 (Fight Club)"
              min="1"
            />
            <button 
              onClick={() => handleSearchById(manualId)} 
              disabled={idLoading || !manualId.trim()}
            >
              {idLoading ? '⏳' : '🔍'} Buscar por ID
            </button>
          </div>
          
          {idError && <div className="tmdb-id-error">❌ {idError}</div>}
          
          {/* ✅ MOSTRAR RESULTADO DE BÚSQUEDA POR ID */}
          {idResult && (
            <div className="tmdb-id-result">
              <h5>✅ {idResult.media_type} encontrada:</h5>
              <div className={`tmdb-result-card ${idResult.media_type === 'Serie de TV' ? 'series' : ''}`}>
                <img 
                  src={idResult.poster_path ? `${IMAGE_BASE_URL}${idResult.poster_path}` : FALLBACK}
                  alt={idResult.title}
                  className="tmdb-result-poster"
                />
                <div className="tmdb-result-info">
                  <h4>{idResult.title}</h4>
                  <p className="tmdb-result-year">
                    📅 {idResult.release_date ? new Date(idResult.release_date).getFullYear() : 'Sin fecha'}
                  </p>
                  <p className="tmdb-result-overview">
                    {idResult.overview ? (idResult.overview.length > 180 ? idResult.overview.slice(0, 180) + '...' : idResult.overview) : 'Sin sinopsis disponible'}
                  </p>
                  <div className="tmdb-result-meta">
                    <span>⭐ {idResult.vote_average?.toFixed(1) || 'N/A'}</span>
                    <span>🆔 {idResult.id}</span>
                    <span>🎬 {idResult.credits?.crew?.find(p => p.job === 'Director')?.name || (idResult.media_type === 'Serie de TV' ? 'Creador desconocido' : 'Director desconocido')}</span>
                    <span className={`tmdb-type ${idResult.media_type === 'Serie de TV' ? 'series' : 'movie'}`}>
                      📺 {idResult.media_type}
                    </span>
                  </div>
                  <button 
                    className="tmdb-select-btn"
                    onClick={() => handleSelectMovie(idResult)}
                    disabled={loading}
                  >
                    ✅ Seleccionar Esta {idResult.media_type}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="tmdb-modal-body">
          {/* ✅ SEPARADOR VISUAL */}
          <div className="tmdb-separator">
            <span>📋 Resultados de búsqueda (películas, series, documentales, etc.)</span>
          </div>
          
          {loading && <div className="tmdb-loading">🔄 Buscando en TMDB...</div>}
          {error && <div className="tmdb-error">❌ {error}</div>}
          
          {!loading && results.length === 0 && query && (
            <div className="tmdb-no-results">❌ No se encontraron resultados para "{query}"</div>
          )}

          <div className="tmdb-results-grid">
            {results.map(movie => (
              <div key={movie.id} className={`tmdb-result-card ${movie.media_type === 'tv' ? 'series' : ''}`}>
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
                    {movie.overview ? (movie.overview.length > 180 ? movie.overview.slice(0, 180) + '...' : movie.overview) : 'Sin sinopsis disponible'}
                  </p>
                  <div className="tmdb-result-meta">
                    <span>⭐ {movie.vote_average?.toFixed(1) || 'N/A'}</span>
                    <span>🆔 {movie.id}</span>
                    <span className={`tmdb-type ${movie.media_type === 'tv' ? 'series' : 'movie'}`}>
                      📺 {movie.media_type === 'movie' ? 'Película' : movie.media_type === 'tv' ? 'Serie de TV' : 'Otro'}
                    </span>
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
