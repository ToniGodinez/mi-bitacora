import React, { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import ImageModal from '../components/ImageModal.jsx';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const FALLBACK = 'https://placehold.co/154x231/222/fff?text=Sin+Imagen';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Stars = ({ value = 0 }) => {
  const full = Math.round(Number(value) || 0);
  return <div className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</div>;
};

const Home = () => {
  const [dbMovies, setDbMovies] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);
  const navigate = useNavigate();

  // Navigation menu component
  const NavigationMenu = () => (
    <div className="nav-container">
      <div className="nav-row">
        <button 
          className="btn-nav" 
          onClick={() => navigate('/')}
        >
          Inicio
        </button>
        <button 
          className="btn-nav" 
          onClick={() => navigate('/actualizacion')}
        >
          Actualización
        </button>
      </div>
    </div>
  );

  const loadDb = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/movies`);
      const data = await res.json();
  console.log('DEBUG: /api/movies response', data);
  // Support a few possible shapes: array, { value: [...] }, { rows: [...] }
  const movies = Array.isArray(data) ? data : (data.value || data.rows || []);
  setDbMovies(movies || []);
  // after loading, try to fetch Spanish overviews for items missing it
  try {
    fillSpanishOverviews(movies || []);
  } catch (err) {
    console.warn('No se pudieron obtener sinopsis en español automáticamente:', err);
  }
    } catch (err) {
      console.error('Error cargando DB:', err);
    } finally {
      setLoading(false);
    }
  };

  // Busca en TMDB (multi) y obtiene overview, géneros y tipo (movie/tv) en español
  async function fetchSpanishOverview(title, year) {
    try {
      const q = encodeURIComponent(title);
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${q}${year ? `&year=${encodeURIComponent(year)}` : ''}&language=es-ES&page=1`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      const first = (d.results || [])[0];
      if (!first) return null;

      // Determine whether it's movie or tv and request details accordingly
      let detail = null;
      if (first.media_type === 'movie' || first.media_type === undefined) {
        const detRes = await fetch(`https://api.themoviedb.org/3/movie/${first.id}?api_key=${TMDB_API_KEY}&language=es-ES`);
        if (detRes.ok) detail = await detRes.json();
      } else if (first.media_type === 'tv') {
        const detRes = await fetch(`https://api.themoviedb.org/3/tv/${first.id}?api_key=${TMDB_API_KEY}&language=es-ES`);
        if (detRes.ok) detail = await detRes.json();
      }

      const overview = (detail && (detail.overview || detail.tagline)) || first.overview || null;
      const genres = (detail && detail.genres && Array.isArray(detail.genres)) ? detail.genres.map(g => g.name) : (first.genre_ids ? first.genre_ids : []);
      const media_type = first.media_type === 'tv' ? 'Serie' : 'Película';

      // if genre names include Documentary (EN) or Documental (ES), mark as Documental
      const isDocumentary = genres.some(g => /documentary|documental/i.test(g));
      return { overview, genres, media_type: isDocumentary ? 'Documental' : media_type };
    } catch (e) {
      console.error('Error TMDB overview fetch:', e);
      return null;
    }
  }

  // Rellena overview_es, genres y media_type en los objetos de movies en estado cuando falte
  async function fillSpanishOverviews(movies) {
    if (!Array.isArray(movies) || movies.length === 0) return;
    const toFetch = movies.filter(m => !m.overview_es || !m.genres || !m.media_type).slice(0, 8);
    for (const m of toFetch) {
      const info = await fetchSpanishOverview(m.title, m.year);
      if (info) {
        const updated = { ...m, overview_es: info.overview || m.overview_es, genres: info.genres || m.genres, media_type: info.media_type || m.media_type };
        // Actualizar UI
        setDbMovies(prev => prev.map(x => x.id === m.id ? { ...x, ...updated } : x));
        // Persistir en la BD (PUT parcial)
        try {
          await fetch(`${API_URL}/api/movies/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overview: info.overview || m.overview_es, genres: info.genres, media_type: info.media_type })
          });
        } catch (e) {
          console.warn('No se pudo persistir overview_es en la BD:', e);
        }
      }
    }
  }

  useEffect(() => { loadDb(); }, []);

  const titleCase = (s) => {
    if (!s) return '—';
    return String(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const applyFilter = (movies) => {
    if (statusFilter === 'all') return movies;
    if (statusFilter === 'vista') return movies.filter(m => String(m.status || '').toLowerCase().trim() === 'vista');
    if (statusFilter === 'en-proceso') return movies.filter(m => String(m.status || '').toLowerCase().trim() === 'en proceso');
    if (statusFilter === 'pendiente') return movies.filter(m => String(m.status || '').toLowerCase().trim() === 'pendiente');
    return movies;
  };

  return (
    <div className="home-page">
      {/* Banner solo con imagen de fondo */}
      <div className="site-banner"></div>
      
      {/* Título y fecha debajo del banner */}
      <div className="site-header">
        <div className="header-content">
          <div className="title-block">
            <div className="site-title">Mi Bitácora 2025 - Proyecto</div>
            <div className="site-subtitle">Tu registro personal de películas</div>
          </div>
          <div className="meta">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Menú principal con buscador y navegación - RESPONSIVE */}
      <div className="nav-row">
        <div className="nav-buttons">
          <button className="btn-nav" onClick={() => { setSearchResults(null); loadDb(); }}>
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Inicio</span>
          </button>
          <button 
            className="btn-nav" 
            onClick={() => navigate('/recomendacion')}
          >
            <span className="nav-icon">🎯</span>
            <span className="nav-text">Recomendación</span>
          </button>
          <button 
            className="btn-nav" 
            onClick={() => navigate('/actualizacion')}
          >
            <span className="nav-icon">🔄</span>
            <span className="nav-text">Actualización</span>
          </button>
        </div>
        <div className="search-container">
          <SearchBar onResults={results => setSearchResults(results && results.length ? results : null)} />
        </div>
      </div>

      {/* Sección de filtros con divisor */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-bar">
            <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Todas</button>
            <button className={`filter-btn ${statusFilter === 'vista' ? 'active' : ''}`} onClick={() => setStatusFilter('vista')}>Vistas</button>
            <button className={`filter-btn ${statusFilter === 'en-proceso' ? 'active' : ''}`} onClick={() => setStatusFilter('en-proceso')}>En Proceso</button>
            <button className={`filter-btn ${statusFilter === 'pendiente' ? 'active' : ''}`} onClick={() => setStatusFilter('pendiente')}>Pendientes</button>
          </div>
        </div>
      </div>

      {/* Si hay resultados de búsqueda mostrarlos y ocultar la tabla de DB */}
      {searchResults ? (
        <div className="search-results">
          {searchResults.map(m => (
            <div key={m.id} className="search-card card-enhanced">
              <div className="poster-container">
                <img 
                  className="poster clickable-poster" 
                  src={m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : FALLBACK} 
                  alt={m.title}
                  onClick={() => setModalImage({
                    url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : FALLBACK,
                    title: m.title
                  })}
                />
                <div className="poster-overlay">🔍</div>
              </div>
              <div className="info">
                <div className="title">{m.title}</div>
                <div className="meta">📅 {m.release_date?.split('-')[0] || 'Sin año'}</div>
                <div className="meta">⭐ {m.vote_average ? `${m.vote_average.toFixed(1)}/10` : 'Sin rating'}</div>
                {m.overview && (
                  <p className="overview-preview">{m.overview.slice(0, 100)}...</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando tu bitácora...</p>
        </div>
      ) : (
        <div className="db-table">
    {applyFilter(dbMovies).map(m => (
              <article className="row-card card-enhanced" key={m.id} role="article" aria-label={`Ficha de película ${m.title}`}>
              <div className="poster-container">
                <img 
                  className="poster clickable-poster" 
                  src={m.poster_url || FALLBACK} 
                  alt={m.title}
                  onClick={() => setModalImage({
                    url: m.poster_url || FALLBACK,
                    title: m.title
                  })}
                />
                <div className="poster-overlay">🔍</div>
              </div>
              <div className="info">
                <div className="movie-header">
                  <div className="title-section">
                      <div className="movie-title">{m.title} <span className="year-badge">({m.year})</span></div>
                      <div className="movie-details">
                        <span className="detail-item">🎬 {m.media_type || (m.is_tv ? 'Serie' : 'Película')}</span>
                        <span className="detail-item">🎭 {m.director || 'Director desconocido'}</span>
                        <span className="detail-item">⭐ <Stars value={m.rating} /></span>
                        <span className="detail-item status-badge status-${String(m.status || '').toLowerCase().replace(' ', '-')}">
                          {m.status === 'vista' ? '✅' : m.status === 'en proceso' ? '⏳' : '📋'} {titleCase(m.status)}
                        </span>
                      </div>
                  </div>
                </div>

                <div className="movie-info-grid">
                  <div className="info-item">
                    <span className="info-label">👥 Actores:</span>
                    <span className="info-value">{m.actors || 'No especificado'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">🏷️ Género:</span>
                    <span className="info-value">{(m.genres && m.genres.length) ? m.genres.join(', ') : 'No especificado'}</span>
                  </div>
                </div>

                <div className="synopsis-section">
                  <p className={`overview ${m._expanded ? 'expanded' : ''}`}>{m.overview_es || m.overview || m.sinopsis || 'Sin sinopsis disponible.'}</p>
                  { (m.overview_es || m.overview || m.sinopsis) && (
                    <button className="link-more" onClick={() => setDbMovies(prev => prev.map(x => x.id === m.id ? { ...x, _expanded: !x._expanded } : x))}>
                      {m._expanded ? '📖 Mostrar menos' : '📑 Mostrar más'}
                    </button>
                  )}
                </div>

                <div className="opinion-section">
                  <div className="opinion-label">💭 Mi opinión:</div>
                  <div className="opinion">"{m.comment ? String(m.comment) : 'Sin opinión registrada'}"</div>
                </div>

                <div className="action-buttons">
                  <button className="btn btn-enhanced" onClick={() => navigate('/edit', { state: { movie: { ...m, _isDb: true } } })}>
                    ✏️ Editar
                  </button>
                  <button
                    className="btn-delete"
                    title="Eliminar película"
                    onClick={async () => {
                      const ok = window.confirm(`¿Eliminar "${m.title}" (${m.year}) de la bitácora? Esta acción no se puede deshacer.`);
                      if (!ok) return;
                      try {
                        const resp = await fetch(`${API_URL}/api/movies/${m.id}`, { method: 'DELETE' });
                        if (resp.ok) {
                          // optimistically remove from UI
                          setDbMovies(prev => prev.filter(x => x.id !== m.id));
                          alert('✅ Registro eliminado exitosamente');
                        } else {
                          const body = await resp.json().catch(() => ({}));
                          console.error('Error al eliminar:', body);
                          alert('❌ No se pudo eliminar el registro');
                        }
                      } catch (err) {
                        console.error('Error de red al eliminar:', err);
                        alert('❌ Error de red al eliminar');
                      }
                    }}
                  >🗑️</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal para ver imágenes en grande */}
      <ImageModal 
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageUrl={modalImage?.url}
        title={modalImage?.title}
      />
    </div>
  );
};

export default Home;
