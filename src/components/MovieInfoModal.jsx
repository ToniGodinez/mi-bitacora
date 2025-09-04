import React, { useState, useEffect } from 'react';
import './MovieInfoModal.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const IMAGE_BASE_URL_LARGE = 'https://image.tmdb.org/t/p/w500';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';

const MovieInfoModal = ({ isOpen, onClose, movie }) => {
  // ✅ VALIDACIÓN CRÍTICA: No renderizar si no está abierto
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('general');
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [tmdbData, setTmdbData] = useState({
    details: null,
    credits: null,
    videos: null,
    images: null,
    watchProviders: null,
    loading: false,
    error: null,
    detectedType: null
  });

  // 🎯 FUNCIONES DE UTILIDAD (copiadas de RecommendMovie.jsx)
  const isValidString = (value) => value && typeof value === 'string' && value.trim() !== '';
  const isValidNumber = (value) => value !== null && value !== undefined && !isNaN(value) && value > 0;
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };
  const isValidArray = (arr) => Array.isArray(arr) && arr.length > 0;

  const formatRuntime = (minutes) => {
    if (!isValidNumber(minutes)) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  };

  const formatBudget = (amount) => {
    if (!isValidNumber(amount)) return '';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // 🎯 FUNCIÓN PARA MANEJAR SINOPSIS EXPANDIBLE
  const getSynopsisText = () => {
    const synopsis = details?.overview || movie?.overview_es || movie?.overview || movie?.sinopsis || '';
    if (!synopsis) return '';
    
    const words = synopsis.split(' ');
    const maxWords = 25; // Límite de palabras para preview (reducido para ser más visible)
    
    if (words.length <= maxWords || synopsisExpanded) {
      return synopsis;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const shouldShowExpandButton = () => {
    const synopsis = details?.overview || movie?.overview_es || movie?.overview || movie?.sinopsis || '';
    return synopsis.split(' ').length > 25;
  };

  // 🖼️ FUNCIONES PARA EL MODAL DE IMAGEN
  const openImageModal = (imagePath, altText) => {
    setSelectedImage({ path: imagePath, alt: altText });
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // 🎯 DETECCIÓN INTELIGENTE DE TIPO DE CONTENIDO
  const detectContentType = (mediaType, tmdbData) => {
    // 1. DETECCIÓN BASADA EN DATOS TMDB
    if (tmdbData) {
      if (tmdbData.first_air_date || tmdbData.last_air_date || tmdbData.number_of_seasons || 
          tmdbData.number_of_episodes || tmdbData.episode_run_time || tmdbData.created_by ||
          tmdbData.networks || tmdbData.seasons) {
        return 'tv';
      }
      if (tmdbData.release_date || (tmdbData.runtime && tmdbData.runtime > 0) ||
          tmdbData.budget || tmdbData.revenue || tmdbData.belongs_to_collection) {
        return 'movie';
      }
    }

    // 2. MAPEO DESDE BASE DE DATOS LOCAL
    const typeMap = {
      'Serie': 'tv', 'series': 'tv', 'Series': 'tv', 'TV': 'tv', 'tv': 'tv',
      'Película': 'movie', 'pelicula': 'movie', 'película': 'movie', 'Movie': 'movie', 'movie': 'movie'
    };

    if (mediaType && typeMap[mediaType]) {
      return typeMap[mediaType];
    }

    // 3. FALLBACK: probar TV primero
    return 'tv';
  };

  // 🔗 CONSTRUCTOR DE URLs DINÁMICAS
  const buildApiUrls = (tmdbId, contentType) => {
    const baseType = contentType === 'tv' ? 'tv' : 'movie';
    const appendToResponse = contentType === 'tv' 
      ? 'content_ratings,external_ids,keywords,recommendations,similar,aggregate_credits,alternative_titles,translations' 
      : 'release_dates,external_ids,keywords,recommendations,similar,alternative_titles,translations';
    
    return {
      details: `https://api.themoviedb.org/3/${baseType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=${appendToResponse}`,
      credits: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`,
      videos: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=es-ES`,
      images: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/images?api_key=${TMDB_API_KEY}`,
      watchProviders: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
    };
  };

  // 🚀 FETCH TMDB DATA CON FALLBACK
  const fetchWithFallback = async (tmdbId, initialType) => {
    try {
      const urls = buildApiUrls(tmdbId, initialType);
      const [detailsRes, creditsRes, videosRes, imagesRes, watchProvidersRes] = await Promise.allSettled([
        fetch(urls.details),
        fetch(urls.credits),
        fetch(urls.videos),
        fetch(urls.images),
        fetch(urls.watchProviders)
      ]);

      if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
        return {
          details: await detailsRes.value.json(),
          credits: creditsRes.status === 'fulfilled' && creditsRes.value.ok ? await creditsRes.value.json() : null,
          videos: videosRes.status === 'fulfilled' && videosRes.value.ok ? await videosRes.value.json() : null,
          images: imagesRes.status === 'fulfilled' && imagesRes.value.ok ? await imagesRes.value.json() : null,
          watchProviders: watchProvidersRes.status === 'fulfilled' && watchProvidersRes.value.ok ? await watchProvidersRes.value.json() : null
        };
      }
    } catch (error) {
      console.warn('⚠️ Error en fetch inicial:', error.message);
    }

    // Fallback con tipo opuesto
    const fallbackType = initialType === 'tv' ? 'movie' : 'tv';
    try {
      const urls = buildApiUrls(tmdbId, fallbackType);
      const [detailsRes, creditsRes, videosRes, imagesRes, watchProvidersRes] = await Promise.allSettled([
        fetch(urls.details),
        fetch(urls.credits),
        fetch(urls.videos),
        fetch(urls.images),
        fetch(urls.watchProviders)
      ]);

      if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
        return {
          details: await detailsRes.value.json(),
          credits: creditsRes.status === 'fulfilled' && creditsRes.value.ok ? await creditsRes.value.json() : null,
          videos: videosRes.status === 'fulfilled' && videosRes.value.ok ? await videosRes.value.json() : null,
          images: imagesRes.status === 'fulfilled' && imagesRes.value.ok ? await imagesRes.value.json() : null,
          watchProviders: watchProvidersRes.status === 'fulfilled' && watchProvidersRes.value.ok ? await watchProvidersRes.value.json() : null
        };
      }
    } catch (error) {
      console.warn('⚠️ Error en fallback:', error.message);
    }

    return null;
  };

  // 🎯 FUNCIÓN PRINCIPAL PARA OBTENER DATOS TMDB
  const fetchTMDBData = async (tmdbId) => {
    if (!tmdbId) return;
    
    setTmdbData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🚀 Iniciando fetch TMDB para ID:', tmdbId);
      
      const initialType = detectContentType(movie?.media_type, null);
      const fetchResult = await fetchWithFallback(tmdbId, initialType);
      
      if (fetchResult) {
        const finalType = detectContentType(movie?.media_type, fetchResult.details);
        
        if (finalType !== initialType) {
          console.log('🔄 Tipo cambió, refetch con tipo correcto...');
          const correctedResult = await fetchWithFallback(tmdbId, finalType);
          if (correctedResult) {
            setTmdbData({
              ...correctedResult,
              detectedType: finalType,
              loading: false,
              error: null
            });
            return;
          }
        }
        
        setTmdbData({
          ...fetchResult,
          detectedType: finalType,
          loading: false,
          error: null
        });
      } else {
        throw new Error('No se pudieron obtener datos de TMDB');
      }
    } catch (error) {
      console.error('❌ Error fetching TMDB data:', error);
      setTmdbData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Información no disponible por el momento' 
      }));
    }
  };

  // 🎬 EFECTOS
  useEffect(() => {
    if (movie?.tmdbid && isOpen) {
      fetchTMDBData(movie.tmdbid);
    }
  }, [movie?.tmdbid, isOpen]);

  // 🎯 VARIABLES DERIVADAS
  const { details, credits, videos, images, watchProviders, loading, error, detectedType } = tmdbData;
  const isMovie = detectedType === 'movie';
  const isTv = detectedType === 'tv';

  const tabs = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'cast', label: 'Reparto', icon: '👥' },
    { id: 'technical', label: 'Técnico', icon: '⚙️' },
    { id: 'streaming', label: 'Streaming', icon: '📺' },
    { id: 'media', label: 'Media', icon: '🎬' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-content">
            <div className="info-grid">
              {/* 📅 INFORMACIÓN DE FECHAS */}
              <div className="info-item">
                <span className="info-label">📅 Año:</span>
                <span className="info-value">{movie?.year || 'Desconocido'}</span>
              </div>
              
              {/* 📅 FECHAS ESPECÍFICAS PARA SERIES */}
              {isTv && details?.first_air_date && isValidDate(details.first_air_date) && (
                <div className="info-item">
                  <span className="info-label">📅 Primera emisión:</span>
                  <span className="info-value">{new Date(details.first_air_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
              {isTv && details?.last_air_date && isValidDate(details.last_air_date) && (
                <div className="info-item">
                  <span className="info-label">🏁 Última emisión:</span>
                  <span className="info-value">{new Date(details.last_air_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
              
              {/* 📅 FECHA ESPECÍFICA PARA PELÍCULAS */}
              {isMovie && details?.release_date && isValidDate(details.release_date) && (
                <div className="info-item">
                  <span className="info-label">🎬 Estreno:</span>
                  <span className="info-value">{new Date(details.release_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}

              {/* ⭐ PUNTUACIONES Y RATINGS */}
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

              {/* ⏱️ DURACIÓN - INFORMACIÓN ESPECÍFICA PARA PELÍCULAS */}
              {isMovie && details?.runtime && isValidNumber(details.runtime) && (
                <div className="info-item">
                  <span className="info-label">⏱️ Duración:</span>
                  <span className="info-value">{formatRuntime(details.runtime)}</span>
                </div>
              )}

              {/* 📺 INFORMACIÓN ESPECÍFICA PARA SERIES/TV */}
              {isTv && details?.episode_run_time && isValidArray(details.episode_run_time) && (
                <div className="info-item">
                  <span className="info-label">⏱️ Duración episodio:</span>
                  <span className="info-value">{formatRuntime(details.episode_run_time[0])}</span>
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
                  <span className="info-label">🎬 Episodios:</span>
                  <span className="info-value">{details.number_of_episodes}</span>
                </div>
              )}

              {/* 🗣️ IDIOMA Y PAÍS */}
              {details?.original_language && isValidString(details.original_language) && (
                <div className="info-item">
                  <span className="info-label">🗣️ Idioma original:</span>
                  <span className="info-value">{details.original_language.toUpperCase()}</span>
                </div>
              )}
              {details?.origin_country && isValidArray(details.origin_country) && (
                <div className="info-item">
                  <span className="info-label">🌍 País origen:</span>
                  <span className="info-value">{details.origin_country.join(', ')}</span>
                </div>
              )}
              {details?.production_countries && isValidArray(details.production_countries) && (
                <div className="info-item">
                  <span className="info-label">🌍 Países de producción:</span>
                  <span className="info-value">
                    {details.production_countries.map(country => country.name).join(', ')}
                  </span>
                </div>
              )}

              {/* 🔞 CLASIFICACIONES */}
              {isMovie && details?.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification && (
                <div className="info-item">
                  <span className="info-label">🔞 Clasificación:</span>
                  <span className="info-value">
                    {details.release_dates.results.find(r => r.iso_3166_1 === 'US').release_dates[0].certification}
                  </span>
                </div>
              )}
              {isTv && details?.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating && (
                <div className="info-item">
                  <span className="info-label">🔞 Clasificación:</span>
                  <span className="info-value">
                    {details.content_ratings.results.find(r => r.iso_3166_1 === 'US').rating}
                  </span>
                </div>
              )}

              {/* 🎬 INFORMACIÓN DE BASE DE DATOS LOCAL */}
              {movie?.media_type && isValidString(movie.media_type) && (
                <div className="info-item">
                  <span className="info-label">🎬 Tipo (BD):</span>
                  <span className="info-value">{movie.media_type}</span>
                </div>
              )}
              {movie?.status && isValidString(movie.status) && (
                <div className="info-item">
                  <span className="info-label">📋 Estado (BD):</span>
                  <span className="info-value">{movie.status}</span>
                </div>
              )}
            </div>

            {/* 📖 SINOPSIS EXPANDIBLE */}
            {(details?.overview || movie?.overview_es || movie?.overview || movie?.sinopsis) && (
              <div className="synopsis-section">
                <h4 className="section-title">📖 Sinopsis</h4>
                <div className={`synopsis-content ${synopsisExpanded ? 'expanded' : ''}`}>
                  <p className="synopsis-text">{getSynopsisText()}</p>
                </div>
                {/* BOTÓN FUERA DEL CONTENEDOR PARA ASEGURAR VISIBILIDAD */}
                <button 
                  className="synopsis-toggle"
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  style={{ 
                    marginTop: '1rem',
                    backgroundColor: '#00e5ff',
                    color: '#0f1417',
                    border: 'none',
                    padding: '0.5rem 1rem', // Tamaño original
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {synopsisExpanded ? '📖 Ver menos' : '📖 Ver más'}
                </button>
              </div>
            )}

            {/* 💭 TAGLINE/SLOGAN */}
            {details?.tagline && isValidString(details.tagline) && (
              <div className="tagline-section">
                <h4 className="section-title">💭 Slogan</h4>
                <p className="tagline-text">"{details.tagline}"</p>
              </div>
            )}

            {/* 🎭 GÉNEROS DE BASE DE DATOS */}
            {movie?.genres && (
              <div className="genres-section">
                <h4 className="section-title">🎭 Géneros</h4>
                <div className="genres-list">
                  {Array.isArray(movie.genres) 
                    ? movie.genres.map((genre, index) => (
                        <span key={index} className="genre-tag">{genre}</span>
                      ))
                    : movie.genres.split(',').map((genre, index) => (
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
            {/* CREADORES PARA SERIES */}
            {isTv && details?.created_by && details.created_by.length > 0 && (
              <div className="director-section">
                <h4 className="section-title">👨‍💼 Creadores</h4>
                <div className="creators-list">
                  {details.created_by.map((creator, index) => (
                    <span key={creator.id || index} className="creator-name">
                      {creator.name}
                      {index < details.created_by.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* DIRECTOR PARA PELÍCULAS */}
            {isMovie && credits?.crew && (
              <div className="director-section">
                <h4 className="section-title">🎬 Director</h4>
                <div className="directors-list">
                  {credits.crew
                    .filter(person => person.job === 'Director')
                    .map((director, index) => (
                      <span key={director.id} className="director-name">
                        {director.name}
                        {index < credits.crew.filter(p => p.job === 'Director').length - 1 && ', '}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* REPARTO PRINCIPAL */}
            {credits?.cast && credits.cast.length > 0 && (
              <div className="cast-section">
                <h4 className="section-title">👥 Reparto Principal</h4>
                <div className="cast-grid">
                  {credits.cast.slice(0, 12).map((actor) => (
                    <div key={actor.id} className="cast-item">
                      <img 
                        src={actor.profile_path 
                          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` 
                          : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'
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
            
            {/* ACTORES GUARDADOS EN BD (si no hay reparto de TMDB) */}
            {(!credits?.cast || credits.cast.length === 0) && movie?.actors && (
              <div className="saved-actors-section">
                <h4 className="section-title">🎭 Actores (Guardados)</h4>
                <p className="actors-text">{movie.actors}</p>
              </div>
            )}
          </div>
        );
      
      case 'technical':
        return (
          <div className="tab-content">
            <div className="info-grid">
              {/* 💰 INFORMACIÓN FINANCIERA (SOLO PELÍCULAS) */}
              {isMovie && details?.revenue && isValidNumber(details.revenue) && (
                <div className="info-item">
                  <span className="info-label">💰 Recaudación:</span>
                  <span className="info-value">{formatBudget(details.revenue)}</span>
                </div>
              )}
              {isMovie && details?.budget && isValidNumber(details.budget) && (
                <div className="info-item">
                  <span className="info-label">💰 Presupuesto:</span>
                  <span className="info-value">{formatBudget(details.budget)}</span>
                </div>
              )}

              {/* 📺 INFORMACIÓN DE REDES (SOLO SERIES) */}
              {isTv && details?.networks && isValidArray(details.networks) && (
                <div className="info-item">
                  <span className="info-label">📺 Red/Canal:</span>
                  <span className="info-value">
                    {details.networks.map(network => network.name).join(', ')}
                  </span>
                </div>
              )}

              {/* 🏢 PRODUCTORAS */}
              {details?.production_companies && isValidArray(details.production_companies) && (
                <div className="info-item">
                  <span className="info-label">🏢 Productoras:</span>
                  <span className="info-value">
                    {details.production_companies.slice(0, 3).map(company => company.name).join(', ')}
                    {details.production_companies.length > 3 && '...'}
                  </span>
                </div>
              )}

              {/* 🌐 SITIO WEB OFICIAL */}
              {details?.homepage && isValidString(details.homepage) && (
                <div className="info-item">
                  <span className="info-label">🌐 Sitio oficial:</span>
                  <span className="info-value">
                    <a 
                      href={details.homepage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{color: 'var(--accent-cyan)', textDecoration: 'none'}}
                    >
                      Visitar sitio
                    </a>
                  </span>
                </div>
              )}

              {/* 📊 ESTADÍSTICAS AVANZADAS */}
              {details?.popularity && isValidNumber(details.popularity) && (
                <div className="info-item">
                  <span className="info-label">📈 Popularidad TMDB:</span>
                  <span className="info-value">{Math.round(details.popularity)}</span>
                </div>
              )}
              {details?.vote_count && isValidNumber(details.vote_count) && (
                <div className="info-item">
                  <span className="info-label">🗳️ Total de votos:</span>
                  <span className="info-value">{details.vote_count.toLocaleString('es-ES')}</span>
                </div>
              )}

              {/* 📊 ESTADO Y TIPO */}
              {details?.status && isValidString(details.status) && (
                <div className="info-item">
                  <span className="info-label">📊 Estado TMDB:</span>
                  <span className="info-value">{details.status}</span>
                </div>
              )}
              {details?.type && isValidString(details.type) && (
                <div className="info-item">
                  <span className="info-label">📺 Tipo de serie:</span>
                  <span className="info-value">{details.type}</span>
                </div>
              )}

              {/* 🎬 INFORMACIÓN DE BD LOCAL */}
              {movie?.rating && isValidNumber(movie.rating) && (
                <div className="info-item">
                  <span className="info-label">⭐ Calificación (BD):</span>
                  <span className="info-value">{movie.rating}/5</span>
                </div>
              )}
            </div>

            {/* 🎭 TÍTULOS ALTERNATIVOS */}
            {details?.alternative_titles && (
              <div className="alternative-titles-section">
                <h4 className="section-title">🎭 Títulos Alternativos</h4>
                <div className="titles-list">
                  {(isMovie ? details.alternative_titles.titles : details.alternative_titles.results || [])
                    .slice(0, 6)
                    .map((title, index) => (
                    <div key={index} className="title-item">
                      {title.title || title.name}
                      {title.iso_3166_1 && <span> ({title.iso_3166_1})</span>}
                      {title.type && <span> - {title.type}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'streaming':
        return (
          <div className="tab-content">
            {watchProviders?.results?.MX ? (
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
                
                {!watchProviders.results.MX.flatrate && !watchProviders.results.MX.rent && !watchProviders.results.MX.buy && (
                  <p className="no-providers">No hay información de streaming disponible para México</p>
                )}
              </div>
            ) : (
              <div className="no-streaming-info">
                <p>No hay información de streaming disponible</p>
                {movie?.ver_online && (
                  <div className="saved-streaming">
                    <h5 className="provider-title">🔗 Enlace guardado</h5>
                    <a
                      href={movie.ver_online}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="streaming-link"
                    >
                      ▶️ Ver Online
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'media':
        return (
          <div className="tab-content">
            {/* PÓSTER PRINCIPAL */}
            <div className="media-section">
              <h4 className="section-title">🖼️ Póster</h4>
              <div className="poster-container">
                <img 
                  src={
                    details?.poster_path 
                      ? `${IMAGE_BASE_URL_LARGE}${details.poster_path}` 
                      : movie?.poster_url || '/api/placeholder/300/450'
                  } 
                  alt={movie?.title || 'Póster'}
                  className="modal-poster"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/300/450';
                  }}
                />
              </div>
            </div>

            {/* IMÁGENES DE FONDO */}
            {details?.backdrop_path && (
              <div className="backdrop-section">
                <h4 className="section-title">🌅 Fondo</h4>
                <div className="backdrop-container">
                  <img 
                    src={`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`}
                    alt="Backdrop"
                    className="modal-backdrop"
                  />
                </div>
              </div>
            )}

            {/* GALERÍA DE IMÁGENES ADICIONALES - CARRUSEL */}
            {images?.backdrops && images.backdrops.length > 0 && (
              <div className="images-gallery-section">
                <h4 className="section-title">🖼️ Galería ({images.backdrops.length + (images.posters?.length || 0)})</h4>
                <div className="carousel-container">
                  <div className="carousel-track" id="gallery-carousel">
                    {/* Backdrops */}
                    {images.backdrops.map((image, index) => (
                      <div key={`backdrop-${index}`} className="carousel-item">
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${image.file_path}`}
                          alt={`Backdrop ${index + 1}`}
                          className="carousel-image"
                          loading="lazy"
                          onClick={() => openImageModal(image.file_path, `Backdrop ${index + 1}`)}
                        />
                      </div>
                    ))}
                    {/* Pósters */}
                    {images.posters && images.posters.map((image, index) => (
                      <div key={`poster-${index}`} className="carousel-item">
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${image.file_path}`}
                          alt={`Póster alternativo ${index + 1}`}
                          className="carousel-image"
                          loading="lazy"
                          onClick={() => openImageModal(image.file_path, `Póster alternativo ${index + 1}`)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Controles del carrusel */}
                  <button 
                    className="carousel-btn carousel-prev" 
                    onClick={() => {
                      const track = document.getElementById('gallery-carousel');
                      if (track) {
                        track.scrollBy({ left: -320, behavior: 'smooth' });
                      }
                    }}
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>
                  <button 
                    className="carousel-btn carousel-next" 
                    onClick={() => {
                      const track = document.getElementById('gallery-carousel');
                      if (track) {
                        track.scrollBy({ left: 320, behavior: 'smooth' });
                      }
                    }}
                    aria-label="Imagen siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}

            {/* TRAILERS Y VIDEOS EMBEBIDOS */}
            {videos?.results && videos.results.length > 0 && (
              <div className="videos-section">
                <h4 className="section-title">🎬 Trailers y Videos ({videos.results.length})</h4>
                <div className="videos-grid">
                  {videos.results
                    .filter(video => video.site === 'YouTube' && video.key)
                    .slice(0, 4) // Máximo 4 videos para no sobrecargar
                    .map((video, index) => (
                    <div key={video.id || index} className="video-item">
                      <div className="video-info">
                        <h5 className="video-title">{video.name}</h5>
                        <span className="video-type">{video.type}</span>
                      </div>
                      <div className="video-embed">
                        <iframe
                          src={`https://www.youtube.com/embed/${video.key}?rel=0&modestbranding=1`}
                          title={video.name}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="youtube-iframe"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {videos.results.filter(v => v.site === 'YouTube').length === 0 && (
                  <p className="no-videos">No hay videos de YouTube disponibles</p>
                )}
              </div>
            )}

            {!details?.poster_path && !movie?.poster_url && !details?.backdrop_path && (
              <div className="no-media">
                <p>No hay imágenes disponibles</p>
              </div>
            )}
          </div>
        );
      
      default:
        return <div>Selecciona una pestaña</div>;
    }
  };

  return (
    <div className="movie-info-modal-overlay" onClick={onClose}>
      <div className="movie-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="movie-info-modal-header">
          <div className="header-main">
            <h2>
              📽️ {movie?.title || 'Sin título'} 
              {movie?.year && <span className="year-badge">({movie.year})</span>}
            </h2>
            {details?.vote_average && isValidNumber(details.vote_average) && (
              <div className="header-rating">
                <span className="rating-stars">⭐</span>
                <span className="rating-value">{details.vote_average.toFixed(1)}</span>
                <span className="rating-max">/10</span>
              </div>
            )}
          </div>
          {loading && (
            <div className="loading-indicator">
              <span className="loading-spinner">⏳</span>
              <span>Cargando información...</span>
            </div>
          )}
          <button className="movie-info-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="tabs-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="tabs-content">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {renderTabContent()}
        </div>
      </div>

      {/* MODAL DE IMAGEN EN TAMAÑO COMPLETO */}
      {imageModalOpen && selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="image-modal-close" 
              onClick={closeImageModal}
              aria-label="Cerrar imagen"
            >
              ×
            </button>
            <img 
              src={`https://image.tmdb.org/t/p/original${selectedImage.path}`}
              alt={selectedImage.alt}
              className="image-modal-img"
            />
            <div className="image-modal-caption">
              {selectedImage.alt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieInfoModal;