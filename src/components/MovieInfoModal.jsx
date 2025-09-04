import React, { useState, useEffect } from 'react';
import './MovieInfoModal.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

const MovieInfoModal = ({ isOpen, onClose, movie }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [tmdbDetails, setTmdbDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'cast', label: 'Reparto', icon: '👥' },
    { id: 'technical', label: 'Técnico', icon: '⚙️' },
    { id: 'streaming', label: 'Streaming', icon: '📺' },
    { id: 'media', label: 'Media', icon: '🎬' }
  ];

  // Funciones de validación
  const isValidString = (value) => value && typeof value === 'string' && value.trim() !== '';
  const isValidNumber = (value, minValue = 0) => typeof value === 'number' && !isNaN(value) && value >= minValue;
  const isValidArray = (value) => Array.isArray(value) && value.length > 0;
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString !== '0000-00-00';
  };

  // Función para obtener detalles de TMDB
  const fetchTMDBDetails = async () => {
    if (!movie?.tmdbid && !movie?.title) return;
    
    setLoading(true);
    try {
      let tmdbData = null;
      
      // Si tenemos TMDB ID, buscar directamente
      if (movie.tmdbid) {
        const movieUrl = `https://api.themoviedb.org/3/movie/${movie.tmdbid}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits,videos,images,watch/providers,release_dates`;
        const tvUrl = `https://api.themoviedb.org/3/tv/${movie.tmdbid}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits,videos,images,watch/providers,content_ratings`;
        
        try {
          const movieRes = await fetch(movieUrl);
          if (movieRes.ok) {
            tmdbData = await movieRes.json();
            tmdbData.media_type = 'movie';
          }
        } catch {
          try {
            const tvRes = await fetch(tvUrl);
            if (tvRes.ok) {
              tmdbData = await tvRes.json();
              tmdbData.media_type = 'tv';
            }
          } catch (e) {
            console.error('Error fetching TV details:', e);
          }
        }
      }
      
      // Si no tenemos ID o no se encontró, buscar por título
      if (!tmdbData && movie.title) {
        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}&language=es-MX`;
        const searchRes = await fetch(searchUrl);
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const results = searchData.results?.filter(item => 
            item.media_type === 'movie' || item.media_type === 'tv'
          ) || [];
          
          if (results.length > 0) {
            const match = results[0];
            const detailUrl = match.media_type === 'movie' 
              ? `https://api.themoviedb.org/3/movie/${match.id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits,videos,images,watch/providers,release_dates`
              : `https://api.themoviedb.org/3/tv/${match.id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits,videos,images,watch/providers,content_ratings`;
            
            const detailRes = await fetch(detailUrl);
            if (detailRes.ok) {
              tmdbData = await detailRes.json();
              tmdbData.media_type = match.media_type;
            }
          }
        }
      }
      
      setTmdbDetails(tmdbData);
    } catch (error) {
      console.error('Error fetching TMDB details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && movie) {
      fetchTMDBDetails();
    }
  }, [isOpen, movie]);

  const toggleSynopsis = () => {
    setIsSynopsisExpanded(!isSynopsisExpanded);
  };

  const isTextLong = (text) => {
    return text && text.length > 200;
  };

  if (!isOpen || !movie) return null;

  console.log('Modal abierto con película:', movie);
  console.log('TMDB Details:', tmdbDetails);

  const isMovie = tmdbDetails?.media_type === 'movie';
  const isTv = tmdbDetails?.media_type === 'tv';
  const details = tmdbDetails || {};

  return (
    <div className="movie-info-modal-overlay" onClick={onClose}>
      <div className="movie-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="movie-info-modal-header">
          <h2>📽️ {movie.title} {movie.year && `(${movie.year})`}</h2>
          <button className="movie-info-modal-close" onClick={onClose}>×</button>
        </div>

        {loading && (
          <div className="movie-info-loading">
            <div className="loading-spinner"></div>
            <p>Cargando información de TMDB...</p>
          </div>
        )}

        {/* Imagen de fondo */}
        {details?.backdrop_path && (
          <div 
            className="movie-backdrop"
            style={{
              backgroundImage: `url(${BACKDROP_BASE_URL}${details.backdrop_path})`,
            }}
          />
        )}

        <div className="movie-card-new">
          {/* Navigation Tabs */}
          <div className="tabs-container">
            <div className="tabs-navigation">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="tabs-content">
              <div className="tab-content">
                {/* TAB GENERAL */}
                {activeTab === 'general' && (
                  <>
                    <div className="info-grid">
                      {/* Información básica de la BD local */}
                      {movie.year && (
                        <div className="info-item">
                          <span className="info-label">📅 Año:</span>
                          <span className="info-value">{movie.year}</span>
                        </div>
                      )}

                      {/* Información de TMDB */}
                      {isMovie && details?.release_date && isValidDate(details.release_date) && (
                        <div className="info-item">
                          <span className="info-label">🎬 Estreno:</span>
                          <span className="info-value">{new Date(details.release_date).toLocaleDateString('es-ES')}</span>
                        </div>
                      )}

                      {isTv && details?.first_air_date && isValidDate(details.first_air_date) && (
                        <div className="info-item">
                          <span className="info-label">📺 Primera emisión:</span>
                          <span className="info-value">{new Date(details.first_air_date).toLocaleDateString('es-ES')}</span>
                        </div>
                      )}

                      {details?.vote_average && isValidNumber(details.vote_average) && (
                        <div className="info-item">
                          <span className="info-label">⭐ Puntuación TMDB:</span>
                          <span className="info-value">{details.vote_average.toFixed(1)}/10</span>
                        </div>
                      )}

                      {details?.vote_count && isValidNumber(details.vote_count) && (
                        <div className="info-item">
                          <span className="info-label">🗳️ Votos:</span>
                          <span className="info-value">{details.vote_count.toLocaleString('es-ES')}</span>
                        </div>
                      )}

                      {details?.popularity && isValidNumber(details.popularity) && (
                        <div className="info-item">
                          <span className="info-label">📈 Popularidad:</span>
                          <span className="info-value">{Math.round(details.popularity)}</span>
                        </div>
                      )}

                      {isMovie && details?.runtime && isValidNumber(details.runtime) && (
                        <div className="info-item">
                          <span className="info-label">⏱️ Duración:</span>
                          <span className="info-value">{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                        </div>
                      )}

                      {details?.original_language && isValidString(details.original_language) && (
                        <div className="info-item">
                          <span className="info-label">🗣️ Idioma original:</span>
                          <span className="info-value">{details.original_language.toUpperCase()}</span>
                        </div>
                      )}

                      {details?.production_countries && isValidArray(details.production_countries) && (
                        <div className="info-item">
                          <span className="info-label">🌍 País origen:</span>
                          <span className="info-value">{details.production_countries[0].iso_3166_1}</span>
                        </div>
                      )}

                      {/* Información de la BD local */}
                      {movie.country && (
                        <div className="info-item">
                          <span className="info-label">🌍 País (BD):</span>
                          <span className="info-value">{movie.country}</span>
                        </div>
                      )}

                      {movie.media_type && (
                        <div className="info-item">
                          <span className="info-label">🎬 Tipo (BD):</span>
                          <span className="info-value">{movie.media_type}</span>
                        </div>
                      )}

                      {movie.status && (
                        <div className="info-item">
                          <span className="info-label">📋 Estado (BD):</span>
                          <span className="info-value">{movie.status}</span>
                        </div>
                      )}

                      {movie.rating && (
                        <div className="info-item">
                          <span className="info-label">⭐ Mi valoración:</span>
                          <span className="info-value">{'★'.repeat(movie.rating)}{'☆'.repeat(5 - movie.rating)} ({movie.rating}/5)</span>
                        </div>
                      )}
                    </div>

                    {/* Sinopsis */}
                    <div className="synopsis-section">
                      <h4 className="section-title">📖 Sinopsis</h4>
                      <div className={`synopsis-content ${isSynopsisExpanded ? 'expanded' : ''}`}>
                        {details?.overview || movie.overview || 'No hay sinopsis disponible.'}
                      </div>
                      {isTextLong(details?.overview || movie.overview) && (
                        <button className="synopsis-toggle" onClick={toggleSynopsis}>
                          {isSynopsisExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>

                    {/* Mi opinión */}
                    {movie.comment && (
                      <div className="synopsis-section">
                        <h4 className="section-title">💭 Mi opinión</h4>
                        <div className="synopsis-content">
                          {movie.comment}
                        </div>
                      </div>
                    )}

                    {/* Géneros */}
                    {details?.genres && isValidArray(details.genres) && (
                      <div className="genres-section">
                        <h4 className="section-title">🎭 Géneros TMDB</h4>
                        <div className="genres-list">
                          {details.genres.map(genre => (
                            <span key={genre.id} className="genre-tag">{genre.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {movie.genres && (
                      <div className="genres-section">
                        <h4 className="section-title">🎭 Géneros (BD)</h4>
                        <div className="genres-list">
                          {movie.genres.split(',').map((genre, index) => (
                            <span key={index} className="genre-tag">{genre.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* TAB REPARTO */}
                {activeTab === 'cast' && (
                  <>
                    {details?.credits?.cast && isValidArray(details.credits.cast) && (
                      <div className="cast-section">
                        <h4 className="section-title">👥 Reparto</h4>
                        <div className="cast-grid">
                          {details.credits.cast.slice(0, 12).map(actor => (
                            <div key={actor.id} className="cast-member">
                              <img 
                                src={actor.profile_path ? `${IMAGE_BASE_URL}${actor.profile_path}` : 'https://placehold.co/150x225/333/fff?text=Sin+Foto'}
                                alt={actor.name}
                                className="cast-photo"
                              />
                              <div className="cast-info">
                                <div className="cast-name">{actor.name}</div>
                                <div className="cast-character">{actor.character}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {details?.credits?.crew && (
                      <div className="crew-section">
                        <h4 className="section-title">🎬 Equipo técnico destacado</h4>
                        <div className="crew-list">
                          {details.credits.crew
                            .filter(member => ['Director', 'Writer', 'Producer', 'Executive Producer', 'Screenplay', 'Music'].includes(member.job))
                            .slice(0, 10)
                            .map((member, index) => (
                              <div key={index} className="crew-member">
                                <span className="crew-name">{member.name}</span>
                                <span className="crew-job">{member.job}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {movie.actors && (
                      <div className="cast-section">
                        <h4 className="section-title">👥 Actores (BD)</h4>
                        <div className="simple-cast-list">
                          {movie.actors}
                        </div>
                      </div>
                    )}

                    {movie.director && (
                      <div className="crew-section">
                        <h4 className="section-title">🎬 Director (BD)</h4>
                        <div className="simple-crew-info">
                          {movie.director}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* TAB TÉCNICO */}
                {activeTab === 'technical' && (
                  <>
                    <div className="technical-info">
                      <h4 className="section-title">⚙️ Información técnica</h4>
                      <div className="info-grid">
                        {details?.budget && isValidNumber(details.budget, 1) && (
                          <div className="info-item">
                            <span className="info-label">💰 Presupuesto:</span>
                            <span className="info-value">${details.budget.toLocaleString('es-ES')}</span>
                          </div>
                        )}

                        {details?.revenue && isValidNumber(details.revenue, 1) && (
                          <div className="info-item">
                            <span className="info-label">💵 Recaudación:</span>
                            <span className="info-value">${details.revenue.toLocaleString('es-ES')}</span>
                          </div>
                        )}

                        {details?.production_companies && isValidArray(details.production_companies) && (
                          <div className="info-item">
                            <span className="info-label">🏢 Productoras:</span>
                            <span className="info-value">
                              {details.production_companies.slice(0, 3).map(company => company.name).join(', ')}
                            </span>
                          </div>
                        )}

                        {details?.status && isValidString(details.status) && (
                          <div className="info-item">
                            <span className="info-label">📊 Estado TMDB:</span>
                            <span className="info-value">
                              {isMovie ? (
                                details.status === 'Released' ? 'Estrenada' :
                                details.status === 'Post Production' ? 'Post-producción' :
                                details.status === 'In Production' ? 'En producción' :
                                details.status === 'Planned' ? 'Planeada' :
                                details.status === 'Rumored' ? 'Rumoreada' :
                                details.status
                              ) : (
                                details.status === 'Ended' ? 'Finalizada' :
                                details.status === 'Returning Series' ? 'En emisión' :
                                details.status === 'In Production' ? 'En producción' :
                                details.status === 'Canceled' ? 'Cancelada' :
                                details.status === 'Cancelled' ? 'Cancelada' :
                                details.status === 'Pilot' ? 'Piloto' :
                                details.status
                              )}
                            </span>
                          </div>
                        )}

                        {isTv && details?.number_of_seasons && isValidNumber(details.number_of_seasons) && (
                          <div className="info-item">
                            <span className="info-label">📺 Temporadas:</span>
                            <span className="info-value">{details.number_of_seasons}</span>
                          </div>
                        )}

                        {isTv && details?.number_of_episodes && isValidNumber(details.number_of_episodes) && (
                          <div className="info-item">
                            <span className="info-label">📺 Episodios:</span>
                            <span className="info-value">{details.number_of_episodes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* TAB STREAMING */}
                {activeTab === 'streaming' && (
                  <div className="streaming-section">
                    <h4 className="section-title">📺 Dónde ver</h4>
                    {details?.['watch/providers']?.results?.ES?.flatrate && isValidArray(details['watch/providers'].results.ES.flatrate) ? (
                      <div className="providers-grid">
                        {details['watch/providers'].results.ES.flatrate.map(provider => (
                          <div key={provider.provider_id} className="provider-item">
                            <img 
                              src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="provider-logo"
                            />
                            <span className="provider-name">{provider.provider_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-providers">No hay información de streaming disponible para España</p>
                    )}

                    {movie.ver_online && (
                      <div className="custom-streaming">
                        <h5>🔗 Enlace personalizado:</h5>
                        <a 
                          href={movie.ver_online} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="streaming-link"
                        >
                          Ver Online →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB MEDIA */}
                {activeTab === 'media' && (
                  <div className="media-section">
                    <h4 className="section-title">🎬 Multimedia</h4>
                    
                    {/* Poster */}
                    <div className="media-posters">
                      <h5>🖼️ Póster</h5>
                      <div className="poster-display">
                        <img 
                          src={details?.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : (movie.poster_url || 'https://placehold.co/300x450/333/fff?text=Sin+Póster')}
                          alt={movie.title}
                          className="full-poster"
                        />
                      </div>
                    </div>

                    {/* Videos */}
                    {details?.videos?.results && isValidArray(details.videos.results) && (
                      <div className="media-videos">
                        <h5>🎥 Videos</h5>
                        <div className="videos-grid">
                          {details.videos.results
                            .filter(video => video.site === 'YouTube')
                            .slice(0, 6)
                            .map(video => (
                              <div key={video.id} className="video-item">
                                <a 
                                  href={`https://www.youtube.com/watch?v=${video.key}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="video-thumbnail"
                                >
                                  <img 
                                    src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                                    alt={video.name}
                                  />
                                  <div className="play-overlay">▶️</div>
                                </a>
                                <div className="video-info">
                                  <div className="video-name">{video.name}</div>
                                  <div className="video-type">{video.type}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieInfoModal;
