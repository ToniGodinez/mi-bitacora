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

  // 🛡️ FUNCIÓN DE VALIDACIÓN UNIVERSAL PARA NÚMEROS
  const isValidNumber = (value, minValue = 0) => {
    return value !== null && value !== undefined && 
           typeof value === 'number' && 
           !isNaN(value) && 
           value > minValue;
  };

  // 🛡️ FUNCIÓN DE VALIDACIÓN PARA ARRAYS CON NÚMEROS
  const isValidArray = (array, minLength = 1) => {
    return Array.isArray(array) && 
           array.length >= minLength && 
           array[0] !== null && 
           array[0] !== undefined && 
           array[0] > 0;
  };

  // 🎯 FUNCIÓN 1: DETECTOR INTELIGENTE DE TIPO DE CONTENIDO
  const detectContentType = (localMediaType, tmdbData) => {
    console.log('🔍 Detectando tipo de contenido:', { localMediaType, tmdbData: !!tmdbData });
    
    // 1. Si TMDB devuelve datos específicos de serie
    if (tmdbData?.first_air_date || tmdbData?.number_of_seasons || tmdbData?.episode_run_time) {
      console.log('✅ Detectado como TV por datos TMDB');
      return 'tv';
    }
    
    // 2. Si TMDB devuelve datos específicos de película
    if (tmdbData?.release_date || (tmdbData?.runtime && tmdbData.runtime > 0)) {
      console.log('✅ Detectado como MOVIE por datos TMDB');
      return 'movie';
    }
    
    // 3. Mapeo desde base de datos local
    const typeMap = {
      'Serie': 'tv',
      'Película': 'movie',
      'Documental': 'movie', // Documentales suelen ser películas en TMDB
      'TV': 'tv',
      'Film': 'movie',
      'Miniserie': 'tv'
    };
    
    const detectedType = typeMap[localMediaType] || 'movie';
    console.log('📋 Detectado por mapeo local:', detectedType);
    return detectedType;
  };

  // 🎯 FUNCIÓN 2: CONSTRUCTOR DE URLs DINÁMICAS
  const buildApiUrls = (tmdbId, contentType) => {
    const baseType = contentType === 'tv' ? 'tv' : 'movie';
    console.log('🔗 Construyendo URLs para:', { tmdbId, contentType, baseType });
    
    const appendToResponse = contentType === 'tv' 
      ? 'content_ratings,external_ids' 
      : 'release_dates,external_ids';
    
    return {
      details: `https://api.themoviedb.org/3/${baseType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=${appendToResponse}`,
      credits: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`,
      videos: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=es-ES`,
      images: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/images?api_key=${TMDB_API_KEY}`,
      watchProviders: `https://api.themoviedb.org/3/${baseType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
    };
  };

  // 🎯 FUNCIÓN 3: FETCH CON FALLBACK AUTOMÁTICO
  const fetchWithFallback = async (tmdbId, initialType) => {
    console.log('🔄 Intentando fetch con tipo:', initialType);
    
    try {
      const urls = buildApiUrls(tmdbId, initialType);
      const [detailsRes, creditsRes, videosRes, imagesRes, watchProvidersRes] = await Promise.allSettled([
        fetch(urls.details),
        fetch(urls.credits),
        fetch(urls.videos),
        fetch(urls.images),
        fetch(urls.watchProviders)
      ]);

      // Si el endpoint principal funciona, usar estos resultados
      if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
        console.log('✅ Fetch exitoso con tipo:', initialType);
        return {
          details: await detailsRes.value.json(),
          credits: creditsRes.status === 'fulfilled' && creditsRes.value.ok ? await creditsRes.value.json() : null,
          videos: videosRes.status === 'fulfilled' && videosRes.value.ok ? await videosRes.value.json() : null,
          images: imagesRes.status === 'fulfilled' && imagesRes.value.ok ? await imagesRes.value.json() : null,
          watchProviders: watchProvidersRes.status === 'fulfilled' && watchProvidersRes.value.ok ? await watchProvidersRes.value.json() : null
        };
      }
    } catch (error) {
      console.warn('⚠️ Error en fetch principal:', error.message);
    }

    // FALLBACK: Intentar con el tipo alternativo
    console.log('🔄 Intentando fallback...');
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
        console.log('✅ Fallback exitoso con tipo:', fallbackType);
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

    // Si ambos fallan, retornar null
    console.error('❌ Ambos endpoints fallaron para TMDB ID:', tmdbId);
    return null;
  };

  // 🎯 FUNCIÓN PRINCIPAL MEJORADA: fetchTMDBData con detección inteligente
  const fetchTMDBData = async (tmdbId) => {
    if (!tmdbId) return;
    
    setTmdbData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🚀 Iniciando fetch TMDB para ID:', tmdbId);
      
      // PASO 1: Detectar tipo inicial basado en BD local
      const initialType = detectContentType(recommendedMovie?.media_type, null);
      
      // PASO 2: Fetch con sistema de fallback
      const fetchResult = await fetchWithFallback(tmdbId, initialType);
      
      if (fetchResult) {
        // PASO 3: Re-detectar tipo con datos reales de TMDB
        const finalType = detectContentType(recommendedMovie?.media_type, fetchResult.details);
        console.log('🎯 Tipo final detectado:', finalType);
        
        // PASO 4: Si el tipo cambió, hacer fetch correcto
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
        
        // PASO 5: Usar resultado exitoso
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

    const { details, credits, videos, images, watchProviders, detectedType } = tmdbData;
    
    // 🎯 Usar tipo detectado para renderizado inteligente
    const isMovie = detectedType === 'movie';
    const isTv = detectedType === 'tv';
    
    console.log('🎨 Renderizando con tipo:', detectedType, { isMovie, isTv });

    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">📅 Año:</span>
                <span className="info-value">{recommendedMovie.year}</span>
              </div>
              {details?.vote_average && isValidNumber(details.vote_average) && (
                <div className="info-item">
                  <span className="info-label">⭐ Puntuación TMDB:</span>
                  <span className="info-value">{details.vote_average.toFixed(1)}/10</span>
                </div>
              )}
              {/* INFORMACIÓN ESPECÍFICA PARA PELÍCULAS */}
              {isMovie && details?.runtime && isValidNumber(details.runtime) && (
                <div className="info-item">
                  <span className="info-label">⏱️ Duración:</span>
                  <span className="info-value">{formatRuntime(details.runtime)}</span>
                </div>
              )}
              {/* INFORMACIÓN ESPECÍFICA PARA SERIES/TV */}
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
              {isTv && details?.status && (
                <div className="info-item">
                  <span className="info-label">📡 Estado serie:</span>
                  <span className="info-value">
                    {details.status === 'Ended' ? 'Finalizada' : 
                     details.status === 'Returning Series' ? 'En emisión' : 
                     details.status === 'In Production' ? 'En producción' :
                     details.status === 'Canceled' ? 'Cancelada' :
                     details.status === 'Pilot' ? 'Piloto' :
                     details.status}
                  </span>
                </div>
              )}
              
              {/* FECHAS ESPECÍFICAS PARA SERIES */}
              {isTv && details?.first_air_date && (
                <div className="info-item">
                  <span className="info-label">📅 Primera emisión:</span>
                  <span className="info-value">{new Date(details.first_air_date).getFullYear()}</span>
                </div>
              )}
              {isTv && details?.last_air_date && details.status === 'Ended' && (
                <div className="info-item">
                  <span className="info-label">🏁 Última emisión:</span>
                  <span className="info-value">{new Date(details.last_air_date).getFullYear()}</span>
                </div>
              )}
              
              {/* CLASIFICACIONES */}
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
            {/* CREADORES PARA SERIES */}
            {isTv && details?.created_by && details.created_by.length > 0 && (
              <div className="director-section">
                <h4 className="section-title">👨‍💼 Creadores</h4>
                <div className="creators-list">
                  {details.created_by.map((creator, index) => (
                    <span key={creator.id || index} className="creator-name">
                      {creator.name}
                    </span>
                  )).reduce((prev, curr, index) => [prev, index > 0 ? ', ' : '', curr])}
                </div>
              </div>
            )}
            
            {/* DIRECTOR PARA PELÍCULAS */}
            {isMovie && recommendedMovie.director && (
              <div className="director-section">
                <h4 className="section-title">🎬 Director</h4>
                <p className="director-name">{recommendedMovie.director}</p>
              </div>
            )}
            
            {/* INFORMACIÓN DE RED/CADENA PARA SERIES */}
            {isTv && details?.networks && details.networks.length > 0 && (
              <div className="networks-section">
                <h4 className="section-title">📺 Cadena/Red</h4>
                <div className="networks-list">
                  {details.networks.map((network) => (
                    <span key={network.id} className="network-tag">{network.name}</span>
                  ))}
                </div>
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
              {details?.budget && isValidNumber(details.budget) && (
                <div className="info-item">
                  <span className="info-label">💰 Presupuesto:</span>
                  <span className="info-value">{formatBudget(details.budget)}</span>
                </div>
              )}
              {details?.revenue && isValidNumber(details.revenue) && (
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
              {details?.popularity && isValidNumber(details.popularity) && (
                <div className="info-item">
                  <span className="info-label">📈 Popularidad:</span>
                  <span className="info-value">{details.popularity.toFixed(1)}</span>
                </div>
              )}
              {details?.vote_count && isValidNumber(details.vote_count) && (
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
