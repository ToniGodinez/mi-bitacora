import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecommendMovie_NEW.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const IMAGE_BASE_URL_LARGE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';

const RecommendMovie = () => {
  const [recommendedMovie, setRecommendedMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [tmdbData, setTmdbData] = useState({
    details: null,
    credits: null,
    videos: null,
    images: null,
    watchProviders: null,
    loading: false,
    error: null
  });
  const navigate = useNavigate();

  const tabs = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'cast', label: 'Reparto', icon: '👥' },
    { id: 'technical', label: 'Técnico', icon: '⚙️' },
    { id: 'streaming', label: 'Streaming', icon: '📺' },
    { id: 'media', label: 'Media', icon: '🎬' }
  ];

  const toggleSynopsis = () => {
    setIsSynopsisExpanded(!isSynopsisExpanded);
  };

  const isTextLong = (text) => {
    return text && text.length > 200;
  };

  // Función para obtener información detallada de TMDB
  const fetchTMDBData = async (tmdbId) => {
    if (!tmdbId) return;
    
    setTmdbData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [detailsRes, creditsRes, videosRes, imagesRes, watchProvidersRes] = await Promise.allSettled([
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=es-ES`),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`)
      ]);

      const details = detailsRes.status === 'fulfilled' && detailsRes.value.ok 
        ? await detailsRes.value.json() : null;
      const credits = creditsRes.status === 'fulfilled' && creditsRes.value.ok 
        ? await creditsRes.value.json() : null;
      const videos = videosRes.status === 'fulfilled' && videosRes.value.ok 
        ? await videosRes.value.json() : null;
      const images = imagesRes.status === 'fulfilled' && imagesRes.value.ok 
        ? await imagesRes.value.json() : null;
      const watchProviders = watchProvidersRes.status === 'fulfilled' && watchProvidersRes.value.ok 
        ? await watchProvidersRes.value.json() : null;

      setTmdbData({
        details,
        credits,
        videos,
        images,
        watchProviders,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching TMDB data:', error);
      setTmdbData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Información no disponible por el momento' 
      }));
    }
  };

  useEffect(() => {
    fetchRandomPendingMovie();
  }, []);

  useEffect(() => {
    if (recommendedMovie?.tmdbid) {
      fetchTMDBData(recommendedMovie.tmdbid);
    }
  }, [recommendedMovie]);

  const fetchRandomPendingMovie = async () => {
    try {
      setLoading(true);
      setIsSynopsisExpanded(false);
      setActiveTab('general'); // Reset to general tab
      
      const res = await fetch(`${API_URL}/api/movies`);
      const data = await res.json();
      
      const pendingMovies = Array.isArray(data) 
        ? data.filter(movie => movie.status === 'pendiente')
        : [];

      if (pendingMovies.length === 0) {
        setRecommendedMovie(null);
        setLoading(false);
        return;
      }

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

  // Función para formatear duración
  const formatRuntime = (minutes) => {
    if (!minutes) return 'No disponible';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Función para formatear presupuesto
  const formatBudget = (amount) => {
    if (!amount) return 'No disponible';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Renderizar contenido del tab activo
  const renderTabContent = () => {
    if (tmdbData.loading) {
      return (
        <div className="tab-loading">
          <div className="loading-spinner"></div>
          <p>Cargando información adicional...</p>
        </div>
      );
    }

    if (tmdbData.error) {
      return (
        <div className="tab-error">
          <p>⚠️ {tmdbData.error}</p>
        </div>
      );
    }

    const { details, credits, videos, images, watchProviders } = tmdbData;

    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">📅 Año:</span>
                <span className="info-value">{recommendedMovie.year}</span>
              </div>
              {details?.vote_average && details.vote_average > 0 && (
                <div className="info-item">
                  <span className="info-label">⭐ Puntuación TMDB:</span>
                  <span className="info-value">{details.vote_average.toFixed(1)}/10</span>
                </div>
              )}
              {/* Para películas */}
              {recommendedMovie.media_type === 'Película' && details?.runtime && details.runtime > 0 && (
                <div className="info-item">
                  <span className="info-label">⏱️ Duración:</span>
                  <span className="info-value">{formatRuntime(details.runtime)}</span>
                </div>
              )}
              {/* Para series */}
              {recommendedMovie.media_type === 'Serie' && details?.episode_run_time && details.episode_run_time.length > 0 && (
                <div className="info-item">
                  <span className="info-label">⏱️ Duración episodio:</span>
                  <span className="info-value">{formatRuntime(details.episode_run_time[0])}</span>
                </div>
              )}
              {/* Número de temporadas para series */}
              {recommendedMovie.media_type === 'Serie' && details?.number_of_seasons && (
                <div className="info-item">
                  <span className="info-label">📺 Temporadas:</span>
                  <span className="info-value">{details.number_of_seasons}</span>
                </div>
              )}
              {/* Número de episodios para series */}
              {recommendedMovie.media_type === 'Serie' && details?.number_of_episodes && (
                <div className="info-item">
                  <span className="info-label">🎬 Episodios:</span>
                  <span className="info-value">{details.number_of_episodes}</span>
                </div>
              )}
              {/* Estado de la serie */}
              {recommendedMovie.media_type === 'Serie' && details?.status && (
                <div className="info-item">
                  <span className="info-label">📡 Estado serie:</span>
                  <span className="info-value">{details.status === 'Ended' ? 'Finalizada' : details.status === 'Returning Series' ? 'En emisión' : details.status}</span>
                </div>
              )}
              {details?.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification && (
                <div className="info-item">
                  <span className="info-label">🔞 Clasificación:</span>
                  <span className="info-value">
                    {details.release_dates.results.find(r => r.iso_3166_1 === 'US').release_dates[0].certification}
                  </span>
                </div>
              )}
              {recommendedMovie.media_type && (
                <div className="info-item">
                  <span className="info-label">🎬 Tipo:</span>
                  <span className="info-value">{recommendedMovie.media_type}</span>
                </div>
              )}
              {recommendedMovie.status && (
                <div className="info-item">
                  <span className="info-label">📋 Estado:</span>
                  <span className="info-value">{recommendedMovie.status}</span>
                </div>
              )}
            </div>
            
            {recommendedMovie.overview && (
              <div className="synopsis-section">
                <h4 className="section-title">📖 Sinopsis</h4>
                <div className={`synopsis-content ${isSynopsisExpanded ? 'expanded' : ''}`}>
                  {recommendedMovie.overview}
                </div>
                {isTextLong(recommendedMovie.overview) && (
                  <button className="synopsis-toggle" onClick={toggleSynopsis}>
                    {isSynopsisExpanded ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            )}
            
            {recommendedMovie.genres && (
              <div className="genres-section">
                <h4 className="section-title">🎭 Géneros</h4>
                <div className="genres-list">
                  {Array.isArray(recommendedMovie.genres) 
                    ? recommendedMovie.genres.map((genre, index) => (
                        <span key={index} className="genre-tag">{genre}</span>
                      ))
                    : recommendedMovie.genres.split(',').map((genre, index) => (
                        <span key={index} className="genre-tag">{genre.trim()}</span>
                      ))
                  }
                </div>
              </div>
            )}
          </div>
        );

      case 'cast':
        return (
          <div className="tab-content">
            {recommendedMovie.director && (
              <div className="director-section">
                <h4 className="section-title">🎬 Director</h4>
                <p className="director-name">{recommendedMovie.director}</p>
              </div>
            )}
            
            {credits?.cast && credits.cast.length > 0 && (
              <div className="cast-section">
                <h4 className="section-title">👥 Reparto Principal</h4>
                <div className="cast-grid">
                  {credits.cast.slice(0, 12).map((actor) => (
                    <div key={actor.id} className="cast-item">
                      <img 
                        src={actor.profile_path 
                          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` 
                          : '/api/placeholder/100/150'
                        }
                        alt={actor.name}
                        className="actor-photo"
                      />
                      <div className="actor-info">
                        <p className="actor-name">{actor.name}</p>
                        <p className="character-name">{actor.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {recommendedMovie.actors && (
              <div className="saved-actors-section">
                <h4 className="section-title">🎭 Actores (Guardados)</h4>
                <p className="actors-text">{recommendedMovie.actors}</p>
              </div>
            )}
          </div>
        );

      case 'technical':
        return (
          <div className="tab-content">
            <div className="info-grid">
              {details?.original_language && (
                <div className="info-item">
                  <span className="info-label">🗣️ Idioma original:</span>
                  <span className="info-value">{details.original_language.toUpperCase()}</span>
                </div>
              )}
              {recommendedMovie.country && (
                <div className="info-item">
                  <span className="info-label">🌍 País:</span>
                  <span className="info-value">{recommendedMovie.country}</span>
                </div>
              )}
              {details?.budget && details.budget > 0 && (
                <div className="info-item">
                  <span className="info-label">💰 Presupuesto:</span>
                  <span className="info-value">{formatBudget(details.budget)}</span>
                </div>
              )}
              {details?.revenue && details.revenue > 0 && (
                <div className="info-item">
                  <span className="info-label">💵 Recaudación:</span>
                  <span className="info-value">{formatBudget(details.revenue)}</span>
                </div>
              )}
              {details?.imdb_id && (
                <div className="info-item">
                  <span className="info-label">🎬 IMDB:</span>
                  <span className="info-value">
                    <a 
                      href={`https://www.imdb.com/title/${details.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{color: 'var(--accent-cyan)', textDecoration: 'none'}}
                    >
                      Ver en IMDB
                    </a>
                  </span>
                </div>
              )}
              {details?.tagline && (
                <div className="info-item">
                  <span className="info-label">💭 Slogan:</span>
                  <span className="info-value">"{details.tagline}"</span>
                </div>
              )}
              {details?.status && (
                <div className="info-item">
                  <span className="info-label">📊 Estado:</span>
                  <span className="info-value">{details.status}</span>
                </div>
              )}
              {details?.popularity && (
                <div className="info-item">
                  <span className="info-label">📈 Popularidad:</span>
                  <span className="info-value">{details.popularity.toFixed(1)}</span>
                </div>
              )}
              {details?.vote_count && (
                <div className="info-item">
                  <span className="info-label">🗳️ Votos:</span>
                  <span className="info-value">{details.vote_count.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {details?.production_companies && details.production_companies.length > 0 && (
              <div className="companies-section">
                <h4 className="section-title">🏢 Productoras</h4>
                <div className="companies-list">
                  {details.production_companies.map((company) => (
                    <span key={company.id} className="company-tag">{company.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'streaming':
        return (
          <div className="tab-content">
            {watchProviders?.results?.MX && (
              <div className="streaming-section">
                <h4 className="section-title">📺 Disponible en México</h4>
                
                {watchProviders.results.MX.flatrate && (
                  <div className="provider-group">
                    <h5 className="provider-title">🔄 Suscripción</h5>
                    <div className="providers-grid">
                      {watchProviders.results.MX.flatrate.map((provider) => (
                        <div key={provider.provider_id} className="provider-item">
                          <img 
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="provider-logo"
                          />
                          <span className="provider-name">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {watchProviders.results.MX.rent && (
                  <div className="provider-group">
                    <h5 className="provider-title">💰 Alquiler</h5>
                    <div className="providers-grid">
                      {watchProviders.results.MX.rent.map((provider) => (
                        <div key={provider.provider_id} className="provider-item">
                          <img 
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="provider-logo"
                          />
                          <span className="provider-name">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {watchProviders.results.MX.buy && (
                  <div className="provider-group">
                    <h5 className="provider-title">🛒 Compra</h5>
                    <div className="providers-grid">
                      {watchProviders.results.MX.buy.map((provider) => (
                        <div key={provider.provider_id} className="provider-item">
                          <img 
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="provider-logo"
                          />
                          <span className="provider-name">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {recommendedMovie.ver_online && (
              <div className="custom-streaming-section">
                <h4 className="section-title">🔗 Enlace personalizado</h4>
                <a
                  className="custom-streaming-link"
                  href={recommendedMovie.ver_online}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver online
                </a>
              </div>
            )}
            
            {(!watchProviders?.results?.MX || 
              (!watchProviders.results.MX.flatrate && 
               !watchProviders.results.MX.rent && 
               !watchProviders.results.MX.buy)) && 
             !recommendedMovie.ver_online && (
              <div className="no-streaming">
                <p>📺 No hay información de streaming disponible</p>
              </div>
            )}
          </div>
        );

      case 'media':
        return (
          <div className="tab-content">
            {videos?.results && videos.results.length > 0 && (
              <div className="videos-section">
                <h4 className="section-title">🎬 Trailers y Videos</h4>
                <div className="videos-grid">
                  {videos.results.slice(0, 4).map((video) => (
                    <div key={video.id} className="video-item">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="video-link"
                      >
                        <img 
                          src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                          alt={video.name}
                          className="video-thumbnail"
                        />
                        <div className="video-info">
                          <p className="video-title">{video.name}</p>
                          <span className="video-type">{video.type}</span>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {images?.backdrops && images.backdrops.length > 0 && (
              <div className="images-section">
                <h4 className="section-title">📸 Imágenes</h4>
                <div className="images-grid">
                  {images.backdrops.slice(0, 8).map((image, index) => (
                    <img 
                      key={index}
                      src={`https://image.tmdb.org/t/p/w500${image.file_path}`}
                      alt={`Imagen ${index + 1}`}
                      className="backdrop-image"
                    />
                  ))}
                </div>
              </div>
            )}
            
            {(!videos?.results || videos.results.length === 0) && 
             (!images?.backdrops || images.backdrops.length === 0) && (
              <div className="no-media">
                <p>🎬 No hay contenido multimedia disponible</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="recommend-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Buscando una película para recomendarte...</h2>
        </div>
      </div>
    );
  }

  if (!recommendedMovie) {
    return (
      <div className="recommend-page">
        <div className="no-movies-container">
          <div className="no-movies-icon">🎬</div>
          <h2>No hay películas pendientes</h2>
          <p>Agrega algunas películas a tu lista de pendientes para recibir recomendaciones.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Ir a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-page">
      <div className="recommendation-container">
        {/* Header */}
        <div className="recommendation-header">
          <h1 className="page-title">🎯 Te recomendamos ver</h1>
        </div>

        {/* Movie Card */}
        <div className="movie-card-new">
          {/* Poster and Basic Info */}
          <div className="movie-main-info">
            <div className="poster-container">
              <img 
                className="movie-poster-large"
                src={recommendedMovie.poster_url 
                  ? recommendedMovie.poster_url 
                  : tmdbData.details?.poster_path 
                    ? `${IMAGE_BASE_URL_LARGE}${tmdbData.details.poster_path}` 
                    : '/api/placeholder/300/450'
                } 
                alt={recommendedMovie.title}
                onError={(e) => {
                  e.target.src = '/api/placeholder/300/450';
                }}
              />
            </div>
            
            <div className="basic-info-container">
              <h2 className="movie-title-large">{recommendedMovie.title}</h2>
              <div className="movie-year-badge">({recommendedMovie.year})</div>
              
              {tmdbData.details?.vote_average && (
                <div className="rating-container">
                  <span className="rating-stars">⭐</span>
                  <span className="rating-value">{tmdbData.details.vote_average.toFixed(1)}</span>
                  <span className="rating-max">/10</span>
                </div>
              )}
              
              {tmdbData.details?.runtime && (
                <div className="runtime-info">
                  <span className="runtime-icon">⏱️</span>
                  <span className="runtime-text">{formatRuntime(tmdbData.details.runtime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tabs-container">
            <div className="tabs-navigation">
              {tabs.map((tab) => (
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

            {/* Tab Content */}
            <div className="tabs-content">
              {renderTabContent()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons-container">
            <button 
              className="btn-primary" 
              onClick={() => navigate('/edit', { state: { movie: { ...recommendedMovie, _isDb: true } } })}
            >
              ✏️ Editar
            </button>
            <button 
              className="btn-secondary" 
              onClick={fetchRandomPendingMovie}
              disabled={loading}
            >
              {loading ? 'Cargando...' : '🔄 Otra'}
            </button>
            {recommendedMovie.ver_online && (
              <a
                className="btn-watch-online"
                href={recommendedMovie.ver_online}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶️ Ver Online
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendMovie;
