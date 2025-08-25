import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UpdateMovie.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const UpdateMovie = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Función para generar IDs únicos
  const generateUniqueId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extra = Math.floor(Math.random() * 1000);
    return `mov_${timestamp}_${random}_${extra}`;
  };

  const [movies, setMovies] = useState([
    {
      id: generateUniqueId(),
      title: '',
      year: '',
      poster_url: '',
      rating: 0,
      comment: '',
      status: 'pendiente',
      director: '',
      actors: '',
      country: '',
      overview: '',
      media_type: '',
      genres: ''
    }
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    const processResults = [];

    try {
      console.log('🎬 Procesando', movies.length, 'películas...');

      for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        
        // Preparar datos de la película con valores por defecto
        const movieData = {
          id: movie.id || `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: movie.title || 'Sin título',
          year: movie.year || '',
          poster_url: movie.poster_url || '',
          rating: movie.rating || 0,
          comment: movie.comment || '',
          status: movie.status || 'pendiente',
          director: movie.director || '',
          actors: movie.actors || '',
          country: movie.country || '',
          overview: movie.overview || '',
          media_type: movie.media_type || 'Película',
          genres: movie.genres || ''
        };

        console.log(`📡 Guardando película ${i + 1}/${movies.length}: "${movieData.title}"`);

        try {
          const response = await fetch(`${API_URL}/api/movies`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(movieData)
          });

          let responseData;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            const text = await response.text();
            responseData = { message: text || 'Respuesta no válida del servidor' };
          }

          if (response.ok) {
            console.log(`✅ Película "${movieData.title}" guardada exitosamente`);
            processResults.push({ 
              title: movieData.title, 
              success: true,
              message: 'Guardada correctamente'
            });
          } else {
            console.error(`❌ Error al guardar "${movieData.title}":`, responseData);
            processResults.push({ 
              title: movieData.title, 
              success: false, 
              error: responseData.message || `Error HTTP ${response.status}` 
            });
          }
        } catch (networkError) {
          console.error(`🌐 Error de red para "${movieData.title}":`, networkError);
          processResults.push({ 
            title: movieData.title, 
            success: false, 
            error: 'Error de conexión: ' + networkError.message 
          });
        }

        // Pequeña pausa entre peticiones para no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🎯 Proceso completado: ${processResults.filter(r => r.success).length}/${processResults.length} películas guardadas`);

    } catch (error) {
      console.error('💥 Error general en el proceso:', error);
      setError('Error general al procesar: ' + error.message);
    } finally {
      setResults(processResults);
      setLoading(false);
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          console.log('Texto leído del CSV:', text.substring(0, 200)); // Debug
          
          // Función mejorada para parsear CSV con caracteres especiales
          const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < line.length) {
              const char = line[i];
              const nextChar = line[i + 1];
              
              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  // Comillas dobles escapadas
                  current += '"';
                  i += 2;
                  continue;
                } else {
                  // Cambiar estado de comillas
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                // Separador encontrado fuera de comillas
                result.push(current.trim().replace(/^"|"$/g, '')); // Remover comillas del inicio y final
                current = '';
              } else {
                current += char;
              }
              i++;
            }
            
            // Agregar el último campo
            result.push(current.trim().replace(/^"|"$/g, ''));
            return result;
          };
          
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          console.log('Líneas encontradas:', lines.length);
          
          // Omitir la primera línea si son encabezados
          const dataLines = lines.slice(1);
          
          // Set para asegurar IDs únicos
          const usedIds = new Set();
          
          const csvMovies = dataLines.map((line, index) => {
            console.log(`Procesando línea ${index + 1}:`, line.substring(0, 100));
            
            const columns = parseCSVLine(line);
            console.log(`Columnas parseadas:`, columns);
            
            // Asegurar que tenemos exactamente 13 columnas
            while (columns.length < 13) {
              columns.push('');
            }
            
            // Si tenemos más de 13 columnas, truncar
            if (columns.length > 13) {
              columns.splice(13);
            }
            
            const [existingId, title, year, poster_url, rating, comment, status, director, actors, country, overview, media_type, genres] = columns;
            
            // Generar ID único e irrepetible
            let uniqueId;
            do {
              uniqueId = generateUniqueId();
            } while (usedIds.has(uniqueId));
            usedIds.add(uniqueId);
            
            console.log('Status original:', status, 'Status procesado:', status?.toLowerCase());
            
            return {
              id: uniqueId,
              title: title || '',
              year: year || '',
              poster_url: poster_url || '',
              rating: rating ? Number(rating) : 0,
              comment: comment || '',
              status: status?.toLowerCase().includes('vista') ? 'vista' : 
                     status?.toLowerCase().includes('proceso') ? 'en proceso' : 'pendiente',
              director: director || '',
              actors: actors || '',
              country: country || '',
              overview: overview || '',
              media_type: media_type || '',
              genres: genres || ''
            };
          });
          
          console.log('Películas procesadas:', csvMovies);
          setMovies(csvMovies);
          
        } catch (error) {
          console.error('Error procesando CSV:', error);
          alert('Error al procesar el archivo CSV: ' + error.message);
        }
      };
      
      reader.onerror = () => {
        console.error('Error al leer el archivo');
        alert('Error al leer el archivo');
      };
      
      // Probar múltiples codificaciones
      try {
        reader.readAsText(file, 'UTF-8');
      } catch (e) {
        console.log('Intentando con ISO-8859-1');
        reader.readAsText(file, 'ISO-8859-1');
      }
    }
  };



  const updateMovieFromTMDB = async (index) => {
    setUpdating(prev => ({ ...prev, [index]: true }));
    
    try {
      const movie = movies[index];
      if (!movie.title) {
        console.log(`Saltando película en índice ${index}: sin título`);
        return false;
      }

      // 1. Buscar película en TMDB
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=5f9a774c4ea58c1d35759ac3a48088d4&query=${encodeURIComponent(movie.title)}&language=es-ES`
      );
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok || !searchData.results?.[0]) {
        console.log(`No se encontró "${movie.title}" en TMDB`);
        return false;
      }

      // 2. Obtener detalles completos
      const tmdbMovie = searchData.results[0];
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=5f9a774c4ea58c1d35759ac3a48088d4&language=es-ES&append_to_response=credits`
      );
      const details = await detailsResponse.json();

      // 3. Actualizar los campos específicos SIN sobrescribir campos existentes importantes
      const newMovies = [...movies];
      newMovies[index] = {
        ...newMovies[index],
        year: tmdbMovie.release_date?.split('-')[0] || newMovies[index].year,
        poster_url: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w300${tmdbMovie.poster_path}` : newMovies[index].poster_url,
        director: details.credits?.crew?.find(p => p.job === 'Director')?.name || newMovies[index].director,
        actors: details.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || newMovies[index].actors,
        country: details.production_countries?.[0]?.name || newMovies[index].country,
        overview: details.overview || newMovies[index].overview,
        media_type: 'Película',
        genres: details.genres?.map(g => g.name).join(', ') || newMovies[index].genres
      };
      
      setMovies(newMovies);
      console.log(`✅ Película "${movie.title}" actualizada correctamente`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error actualizando "${movies[index]?.title}":`, error);
      return false;
    } finally {
      setUpdating(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="update-page">
      {/* Header de navegación fijo */}
      <header className="main-header">
        <div className="header-container">
          <div className="brand">
            <h1 className="brand-title">🎬 Mi Bitácora</h1>
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
              className="nav-link" 
              onClick={() => navigate('/recomendacion')}
            >
              Recomendación
            </button>
            <button 
              className="nav-link active" 
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

      <div className="update-container">
        <h1 className="update-title">Actualización Masiva</h1>
        
        <div className="table-controls">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            style={{ display: 'none' }}
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="btn-upload">
            📁 Cargar CSV
          </label>
          
          <button 
            type="button" 
            className="btn-upload"
            onClick={() => setMovies([...movies, {
              id: generateUniqueId(),
              title: '',
              year: '',
              poster_url: '',
              rating: 0,
              comment: '',
              status: 'pendiente',
              director: '',
              actors: '',
              country: '',
              overview: '',
              media_type: '',
              genres: ''
            }])}
          >
            + Agregar Película
          </button>
        </div>

        <div className="cards-container">
            {movies.map((movie, index) => (
              <div key={movie.id || index} className="movie-card">
                {/* Header con título y acciones */}
                <div className="card-header">
                  {/* Línea 1: Título + Botones */}
                  <div className="title-actions-row">
                    <input
                      type="text"
                      value={movie.title}
                      onChange={e => {
                        const newMovies = [...movies];
                        newMovies[index].title = e.target.value;
                        setMovies(newMovies);
                      }}
                      placeholder="Título de la película"
                      className="title-input"
                    />
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn-update"
                        onClick={() => updateMovieFromTMDB(index)}
                        disabled={updating[index] || !movie.title.trim()}
                        title="Actualizar desde TMDB"
                      >
                        {updating[index] ? '⏳' : '🔄'}
                      </button>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => setMovies(movies.filter((_, i) => i !== index))}
                        title="Eliminar película"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                  
                  {/* Línea 2: Etiquetas rápidas */}
                  <div className="movie-meta">
                    <span className="movie-year">🗓️ {movie.year || 'Sin año'}</span>
                    <span className="movie-status">📋 {movie.status || 'Pendiente'}</span>
                    <span className="movie-rating">⭐ {movie.rating || 0}/5</span>
                  </div>
                </div>

                {/* Contenido principal del card */}
                <div className="card-body">
                  {/* Poster centrado */}
                  <div className="poster-section">
                    {movie.poster_url ? (
                      <img 
                        src={movie.poster_url} 
                        alt={movie.title} 
                        className="poster-image"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="poster-placeholder">
                        🎬
                        <span>Sin poster</span>
                      </div>
                    )}
                    <div className="poster-url-input">
                      <label>URL del Poster:</label>
                      <input
                        type="text"
                        value={movie.poster_url}
                        onChange={e => {
                          const newMovies = [...movies];
                          newMovies[index].poster_url = e.target.value;
                          setMovies(newMovies);
                        }}
                        placeholder="https://image.tmdb.org/..."
                      />
                    </div>
                  </div>

                  {/* Información completa */}
                  <div className="card-detailed-info">
                    <div className="info-grid">
                      <div className="field-group">
                        <label>🗓️ Año</label>
                        <input
                          type="text"
                          value={movie.year}
                          onChange={e => {
                            const newMovies = [...movies];
                            newMovies[index].year = e.target.value;
                            setMovies(newMovies);
                          }}
                          placeholder="2024"
                        />
                      </div>

                      <div className="field-group">
                        <label>⭐ Rating</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={movie.rating}
                          onChange={e => {
                            const newMovies = [...movies];
                            newMovies[index].rating = Number(e.target.value);
                            setMovies(newMovies);
                          }}
                          placeholder="4.5"
                        />
                      </div>

                      <div className="field-group">
                        <label>📋 Estado</label>
                        <select
                          value={movie.status}
                          onChange={e => {
                            const newMovies = [...movies];
                            newMovies[index].status = e.target.value;
                            setMovies(newMovies);
                          }}
                          className="status-select"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="vista">Vista</option>
                          <option value="en proceso">En Proceso</option>
                        </select>
                      </div>

                      <div className="field-group">
                        <label>🎬 Director</label>
                        <input
                          type="text"
                          value={movie.director}
                          onChange={e => {
                            const newMovies = [...movies];
                            newMovies[index].director = e.target.value;
                            setMovies(newMovies);
                          }}
                          placeholder="Nombre del director"
                        />
                      </div>

                      <div className="field-group">
                        <label>🌍 País</label>
                        <input
                          type="text"
                          value={movie.country}
                          onChange={e => {
                            const newMovies = [...movies];
                            newMovies[index].country = e.target.value;
                            setMovies(newMovies);
                          }}
                          placeholder="País de origen"
                        />
                      </div>

                      <div className="field-group">
                        <label>🎭 Tipo</label>
                        <input
                          type="text"
                          value={movie.media_type}
                          onChange={e => {
                            const newMovies = [...movies];
                            newMovies[index].media_type = e.target.value;
                            setMovies(newMovies);
                          }}
                          placeholder="Película, Serie, etc."
                        />
                      </div>
                    </div>

                    <div className="field-group full-width">
                      <label>👥 Actores Principales</label>
                      <textarea
                        value={movie.actors}
                        onChange={e => {
                          const newMovies = [...movies];
                          newMovies[index].actors = e.target.value;
                          setMovies(newMovies);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Actor 1, Actor 2, Actor 3..."
                        rows="2"
                      />
                    </div>

                    <div className="field-group full-width">
                      <label>🎪 Géneros</label>
                      <textarea
                        value={movie.genres}
                        onChange={e => {
                          const newMovies = [...movies];
                          newMovies[index].genres = e.target.value;
                          setMovies(newMovies);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Acción, Drama, Comedia..."
                        rows="2"
                      />
                    </div>

                    <div className="field-group full-width">
                      <label>📖 Sinopsis</label>
                      <textarea
                        value={movie.overview}
                        onChange={e => {
                          const newMovies = [...movies];
                          newMovies[index].overview = e.target.value;
                          setMovies(newMovies);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Descripción de la película..."
                        rows="3"
                        className="synopsis-area"
                      />
                    </div>

                    <div className="field-group full-width">
                      <label>💭 Comentarios Personales</label>
                      <textarea
                        value={movie.comment}
                        onChange={e => {
                          const newMovies = [...movies];
                          newMovies[index].comment = e.target.value;
                          setMovies(newMovies);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Tus comentarios y opiniones..."
                        rows="2"
                        className="comments-area"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        <div className="form-actions">
          <button 
            onClick={handleSubmit}
            className="btn-primary"
            disabled={loading || movies.length === 0}
          >
            {loading ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>

        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <div>Procesando películas...</div>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="results">
            <h2>Resultados del proceso:</h2>
            <div className="results-grid">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`result-card ${result.success ? 'success' : 'error'}`}
                >
                  <strong>{result.title}</strong>
                  {result.success ? (
                    <span className="success-badge">✓ Agregada correctamente</span>
                  ) : (
                    <span className="error-badge">✗ {result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { UpdateMovie as default };