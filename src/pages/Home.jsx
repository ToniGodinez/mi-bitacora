import React, { useEffect, useState, useCallback, useRef } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import MovieInfoModal from '../components/MovieInfoModal.jsx';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const FALLBACK = 'https://placehold.co/154x231/222/fff?text=Sin+Imagen';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Stars = ({ value = 0 }) => {
  // Admit both scales seamlessly: if value > 5, treat as 0–10; else 0–5
  const numeric = Number(value) || 0;
  const normalized = numeric > 5 ? numeric / 2 : numeric; // 0–5
  const full = Math.max(0, Math.min(5, Math.round(normalized)));
  return <div className="stars">{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}</div>;
};

const Home = () => {
  const [dbMovies, setDbMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dbSearch, setDbSearch] = useState('');
  const [dbAlpha, setDbAlpha] = useState('');
  // 🆕 Nuevo estado para filtro por género
  const [genreFilter, setGenreFilter] = useState('');
  // 🆕 Nuevo estado para filtro por rating
  const [ratingFilter, setRatingFilter] = useState('');
  // 🆕 Nuevos estados para estadísticas globales
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    pendientes: 0,
    vistas: 0,
    en_proceso: 0
  });
  const [isSearching, setIsSearching] = useState(false);
  // 🆕 Estado para géneros disponibles
  const [availableGenres, setAvailableGenres] = useState([]);
  // 🆕 Estados para el modal de información
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const navigate = useNavigate();

  // ya no usamos onResults en SearchBar (sin autocompletado)

  // 🆕 Función para cargar estadísticas globales
  const loadGlobalStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies/stats`);
      if (res.ok) {
        const stats = await res.json();
        setGlobalStats(stats);
      }
    } catch (e) {
      console.error('Error cargando estadísticas globales', e);
    }
  }, []);

  // 🆕 Función para cargar géneros disponibles desde el endpoint específico
  const loadAvailableGenres = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies/genres`);
      if (res.ok) {
        const genres = await res.json();
        setAvailableGenres(genres || []);
        console.log('📊 Géneros cargados desde base de datos:', genres);
      } else {
        console.error('Error al cargar géneros:', res.status);
        setAvailableGenres([]);
      }
    } catch (e) {
      console.error('Error cargando géneros', e);
      setAvailableGenres([]);
    }
  }, []);

  // 🆕 Función para búsqueda/filtrado global
  const loadFilteredMovies = useCallback(async () => {
    // Si hay búsqueda o filtro alfabético, usar el endpoint de búsqueda
    if (dbSearch.trim() || dbAlpha || statusFilter !== 'all' || genreFilter || ratingFilter) {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        
        if (dbSearch.trim()) params.set('q', dbSearch.trim());
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (dbAlpha) params.set('alpha', dbAlpha);
        if (genreFilter) params.set('genre', genreFilter);
        if (ratingFilter) params.set('rating', ratingFilter);        const res = await fetch(`${API_URL}/api/movies/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setDbMovies(data.rows || []);
          setTotal(data.total || 0);
        } else {
          setDbMovies([]);
          setTotal(0);
        }
      } catch (e) {
        console.error('Error en búsqueda global', e);
        setDbMovies([]);
        setTotal(0);
      }
      setIsSearching(false);
    } else {
      // Sin filtros, usar el endpoint normal
      loadDb();
    }
  }, [page, limit, dbSearch, dbAlpha, statusFilter, genreFilter, ratingFilter]);

  const loadDb = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies?page=${page}&limit=${limit}`);
      if (!res.ok) {
        setDbMovies([]);
        setTotal(null);
        return;
      }
      const data = await res.json();
      // Soportar dos formatos: array (legacy) o { rows, total }
      if (Array.isArray(data)) {
        setDbMovies(data || []);
        setTotal(data.length);
      } else if (data && Array.isArray(data.rows)) {
        setDbMovies(data.rows || []);
        setTotal(typeof data.total === 'number' ? data.total : data.rows.length);
      } else {
        setDbMovies([]);
        setTotal(null);
      }
      // Ejecutar auto-fill solo si está explícitamente habilitado y hay TMDB key
      if (import.meta.env.VITE_ENABLE_AUTO_FILL === 'true' && TMDB_API_KEY) {
        fillSpanishOverviews(movies || []);
      }
    } catch (e) {
      console.error('Error cargando DB', e);
      setDbMovies([]);
    }
  }, [page, limit]);

  useEffect(() => { 
    loadFilteredMovies(); 
  }, [loadFilteredMovies]);

  // 🆕 Cargar estadísticas globales al iniciar
  useEffect(() => {
    loadGlobalStats();
  }, [loadGlobalStats]);

  // 🆕 Cargar géneros disponibles al iniciar
  useEffect(() => {
    loadAvailableGenres();
  }, [loadAvailableGenres]);

  // 🆕 Recargar estadísticas cuando se elimina una película
  const refreshAfterDelete = useCallback(() => {
    loadGlobalStats();
    loadFilteredMovies();
    loadAvailableGenres(); // 🆕 También recargar géneros
  }, [loadGlobalStats, loadFilteredMovies, loadAvailableGenres]);

  async function fetchSpanishOverviewById(id, type = 'movie') {
    try {
      const url = type === 'tv'
        ? `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=es-ES`
        : `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=es-ES`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      const overview = d.overview || d.tagline || null;
      const genres = Array.isArray(d.genres) ? d.genres.map(g => g.name) : [];
      return { overview, genres, media_type: type === 'tv' ? 'Serie' : 'Película' };
    } catch (e) { return null; }
  }

  async function fetchSpanishOverviewByQuery(title, year) {
    if (!TMDB_API_KEY) return null;
    try {
      const q = encodeURIComponent(title || '');
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${q}${year ? `&year=${encodeURIComponent(year)}` : ''}&language=es-ES&page=1`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      const first = (d.results || [])[0];
      if (!first) return null;
      const detailUrl = first.media_type === 'tv'
        ? `https://api.themoviedb.org/3/tv/${first.id}?api_key=${TMDB_API_KEY}&language=es-ES`
        : `https://api.themoviedb.org/3/movie/${first.id}?api_key=${TMDB_API_KEY}&language=es-ES`;
      const det = await fetch(detailUrl);
      if (!det.ok) return { overview: first.overview || null, genres: [], media_type: first.media_type === 'tv' ? 'Serie' : 'Película' };
      const detJson = await det.json();
      const overview = detJson.overview || detJson.tagline || first.overview || null;
      const genres = Array.isArray(detJson.genres) ? detJson.genres.map(g => g.name) : [];
      return { overview, genres, media_type: first.media_type === 'tv' ? 'Serie' : 'Película' };
    } catch (e) { return null; }
  }

  const fillingRef = useRef(false);

  async function fillSpanishOverviews(movies) {
    // No continuar si no hay TMDB key
    if (!TMDB_API_KEY) return;
    if (!Array.isArray(movies) || movies.length === 0) return;
    // Evitar ejecuciones concurrentes
    if (fillingRef.current) return;
    fillingRef.current = true;
    try {
      const batchSize = Number(import.meta.env.VITE_AUTO_FILL_BATCH_SIZE || 1);
      const toFetch = movies.filter(m => !m.overview_es && !m.genres).slice(0, Math.max(0, batchSize));
      for (const m of toFetch) {
        try {
          let info = null;
          if (m.tmdbId) info = await fetchSpanishOverviewById(m.tmdbId, m.media_type === 'Serie' ? 'tv' : 'movie');
          if (!info) info = await fetchSpanishOverviewByQuery(m.title, m.year);
          if (info) {
            setDbMovies(prev => prev.map(x => x.id === m.id ? { ...x, overview_es: info.overview || x.overview_es, genres: info.genres || x.genres, media_type: info.media_type || x.media_type } : x));
            fetch(`${API_URL}/api/movies/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overview: info.overview, genres: info.genres, media_type: info.media_type }) }).catch(() => {});
          }
        } catch (e) { /* silent */ }
      }
    } finally {
      fillingRef.current = false;
    }
  }

  const titleCase = s => { if (!s) return '—'; return String(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };

  // 🆕 Función para abrir el modal de información
  const openInfoModal = (event, movie) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('🚀 Abriendo modal para película:', movie?.title);
    console.log('🚀 Estado antes:', { isInfoModalOpen, selectedMovie: selectedMovie?.title });
    setSelectedMovie(movie);
    setIsInfoModalOpen(true);
    console.log('🚀 Estado después (debería cambiar):', { isInfoModalOpen: true, selectedMovie: movie?.title });
  };

  // 🆕 Función para cerrar el modal de información
  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedMovie(null);
  };

  // 🆕 Ya no necesitamos filtrar localmente porque el backend hace el filtrado
  const displayMovies = dbMovies;

  return (
    <div className="home-page">
      <div className="search-and-filters">
        <div className="search-section">
          <SearchBar />
        </div>
        <div className="filters-section">
          <div className="unified-filter-bar">
            <div className="status-filters">
              <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Todas</button>
              <button className={`filter-btn ${statusFilter === 'vista' ? 'active' : ''}`} onClick={() => setStatusFilter('vista')}>Vistas</button>
              <button className={`filter-btn ${statusFilter === 'en-proceso' ? 'active' : ''}`} onClick={() => setStatusFilter('en-proceso')}>En Proceso</button>
              <button className={`filter-btn ${statusFilter === 'pendiente' ? 'active' : ''}`} onClick={() => setStatusFilter('pendiente')}>Pendientes</button>
            </div>
            
            <div className="filter-separator">|</div>
            
            <div className="genre-filters">
              <span className="filter-label">Filtrar por género:</span>
              <select 
                className="genre-select" 
                value={genreFilter} 
                onChange={(e) => setGenreFilter(e.target.value)}
              >
                <option value="">Todos los géneros</option>
                {availableGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-separator">|</div>
            
            <div className="rating-filters">
              <span className="filter-label">Filtrar por rating:</span>
              <select 
                className="rating-select" 
                value={ratingFilter} 
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="">Todos los ratings</option>
                <option value="5">★★★★★ (5 estrellas)</option>
                <option value="4">★★★★☆ (4 estrellas)</option>
                <option value="3">★★★☆☆ (3 estrellas)</option>
                <option value="2">★★☆☆☆ (2 estrellas)</option>
                <option value="1">★☆☆☆☆ (1 estrella)</option>
                <option value="0">Sin rating</option>
              </select>
            </div>
            
            <div className="filter-separator">|</div>
            
            <div className="clear-filters">
              <button 
                className="genre-clear-btn" 
                onClick={() => {
                  setGenreFilter('');
                  setRatingFilter('');
                  setStatusFilter('all');
                  setDbSearch('');
                  setDbAlpha('');
                  setPage(1);
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="db-search-box">
        <div className="db-search-row">
          <input
            type="text"
            className="db-search-input"
            placeholder="Buscar en tu bitácora..."
            value={dbSearch}
            onChange={e => setDbSearch(e.target.value)}
          />
        </div>

        <div className="db-alpha-filter">
          <button type="button" className="db-alpha-clear" title="Limpiar selección" onClick={() => setDbAlpha('')}>Limpiar</button>
          {[...Array(26)].map((_, i) => {
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={letter}
                type="button"
                className={`db-alpha-btn${dbAlpha === letter ? ' active' : ''}`}
                onClick={() => setDbAlpha(dbAlpha === letter ? '' : letter)}
              >{letter}</button>
            );
          })}
        </div>

        <div className="db-count-row">
          <div className="db-count-unified">
            <span className="count-item">Total: <span className="count-value">{globalStats.total}</span></span>
            <span className="count-separator">|</span>
            <span className="count-item">Pendientes: <span className="count-value">{globalStats.pendientes}</span></span>
            <span className="count-separator">|</span>
            <span className="count-item">Vistas: <span className="count-value">{globalStats.vistas}</span></span>
            <span className="count-separator">|</span>
            <span className="count-item">En proceso: <span className="count-value">{globalStats.en_proceso}</span></span>
          </div>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="pagination-controls">
        <div className="pagination-nav">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <button className="btn" disabled={total !== null && page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next</button>
          <span className="pagination-info">Página {page}{total ? ` de ${Math.max(1, Math.ceil(total / limit))}` : ''}</span>
        </div>
        <div className="per-page-controls">
          <label className="per-page-label">Por página:</label>
          <select className="per-page-select" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {searchResults ? (
        <div className="search-results">
          {searchResults.map(m => (
            <div key={m.id} className="search-card">
              <img className="poster" src={m.poster_path ? `https://image.tmdb.org/t/p/w154${m.poster_path}` : FALLBACK} alt={m.title} />
              <div className="info">
                <div className="title">{m.title}</div>
                <div className="meta">{m.release_date?.split('-')[0] || 'Sin año'}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="db-table">
          {displayMovies.map(m => (
            <article className="row-card" key={m.id} role="article" aria-label={`Ficha de película ${m.title}`}>
              <img className="poster" src={m.poster_url || FALLBACK} alt={m.title} />
              <div className="info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      <span className="title">{m.title}</span> <span className="meta">({m.year})</span>
                    </div>
                    <div className="meta"><span className="meta-label">Tipo:</span> <span className="meta-value">{m.media_type || (m.is_tv ? 'Serie' : 'Película')}</span></div>
                    <div className="meta"><span className="meta-label">Director:</span> <span className="meta-value">{m.director || 'Desconocido'}</span></div>
                    <div className="meta"><span className="meta-label">Actores:</span> <span className="meta-value">{m.actors || '—'}</span></div>
                    <div className="meta"><span className="meta-label">Género:</span> <span className="meta-value">{(m.genres && m.genres.length) ? m.genres.join(', ') : '—'}</span></div>
                    <p className={`overview ${m._expanded ? 'expanded' : ''}`}>{m.overview_es || m.overview || m.sinopsis || 'Sin sinopsis disponible.'}</p>
                    {(m.overview_es || m.overview || m.sinopsis) && (
                      <button className="link-more" onClick={() => setDbMovies(prev => prev.map(x => x.id === m.id ? { ...x, _expanded: !x._expanded } : x))}>
                        {m._expanded ? 'Mostrar menos' : 'Mostrar más'}
                      </button>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Stars value={m.rating} />
                    <div className="meta">Estado: {titleCase(m.status)}</div>
                    {m._isDb && <div className="badge">Ficha local</div>}
                  </div>
                </div>
                <div className="opinion">"{m.comment ? String(m.comment) : 'Sin opinión'}"</div>
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn" 
                    title="Información" 
                    onClick={(e) => openInfoModal(e, m)}
                    type="button"
                  >
                    ❗ Info
                  </button>
                  <button className="btn" onClick={() => navigate('/edit', { state: { movie: { ...m, _isDb: true } } })}>✏️ Editar</button>
                  {m.ver_online && (
                    <a
                      className="btn-ver-online btn"
                      href={m.ver_online}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver online"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      ▶︎ Ver Online
                    </a>
                  )}
                  <button
                    className="btn-delete"
                    title="Eliminar"
                    onClick={async () => {
                      const ok = window.confirm(`¿Eliminar "${m.title}" (${m.year}) de la bitácora? Esta acción no se puede deshacer.`);
                      if (!ok) return;
                      try {
                        const resp = await fetch(`${API_URL}/api/movies/${m.id}`, { method: 'DELETE' });
                        if (resp.ok) {
                          setDbMovies(prev => prev.filter(x => x.id !== m.id));
                          refreshAfterDelete(); // 🆕 Recargar estadísticas
                          alert('Registro eliminado');
                        } else {
                          alert('No se pudo eliminar el registro');
                        }
                      } catch (err) {
                        console.error('Error de red al eliminar:', err);
                        alert('Error de red al eliminar');
                      }
                    }}
                  >−</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de información de película */}
      <MovieInfoModal 
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        movie={selectedMovie}
      />
    </div>
  );
};

export default Home;




