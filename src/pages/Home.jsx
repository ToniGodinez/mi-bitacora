import React, { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const FALLBACK = 'https://placehold.co/154x231/222/fff?text=Sin+Imagen';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Stars = ({ value = 0 }) => {
  const full = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return <div className="stars">{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}</div>;
};

const Home = () => {
  const [dbMovies, setDbMovies] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [dbSearch, setDbSearch] = useState("");
  const [dbAlpha, setDbAlpha] = useState("");

  // applyFilter is declared below; define it as a function and then compute filteredDb

  // NOTE: Navigation and mobile sidebar are provided by `Layout.jsx` to avoid duplication.

  const loadDb = async () => {
    try {
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
    }
  };

  // Busca en TMDB (multi) y obtiene overview, géneros y tipo (movie/tv) en español
  async function fetchSpanishOverview(title, year) {
    // Ahora acepta tmdbId como primer argumento, si existe lo usa
    async function fetchSpanishOverview(title, year, tmdbId, mediaType) {
      try {
        if (tmdbId) {
          let detail = null;
          let type = mediaType || 'movie';
          if (type === 'tv') {
            const detRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`);
            if (detRes.ok) detail = await detRes.json();
          } else {
            const detRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`);
            if (detRes.ok) detail = await detRes.json();
          }
          if (!detail) return null;
          const overview = detail.overview || detail.tagline || null;
          const genres = Array.isArray(detail.genres) ? detail.genres.map(g => g.name) : [];
          const media_type = type === 'tv' ? 'Serie' : 'Película';
          const isDocumentary = genres.some(g => /documentary|documental/i.test(g));
          return { overview, genres, media_type: isDocumentary ? 'Documental' : media_type };
        } else {
          const q = encodeURIComponent(title);
          const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${q}${year ? `&year=${encodeURIComponent(year)}` : ''}&language=es-ES&page=1`;
          const r = await fetch(url);
          if (!r.ok) return null;
          const d = await r.json();
          const first = (d.results || [])[0];
          if (!first) return null;
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
          const isDocumentary = genres.some(g => /documentary|documental/i.test(g));
          return { overview, genres, media_type: isDocumentary ? 'Documental' : media_type };
        }
      } catch (e) {
        console.error('Error TMDB overview fetch:', e);
        return null;
      }
    }
  }

  // Rellena overview_es, genres y media_type en los objetos de movies en estado cuando falte
  async function fillSpanishOverviews(movies) {
    if (!Array.isArray(movies) || movies.length === 0) return;
    const toFetch = movies.filter(m => !m.overview_es || !m.genres || !m.media_type).slice(0, 8);
    for (const m of toFetch) {
      const info = await fetchSpanishOverview(m.title, m.year, m.tmdbId, m.media_type);
      if (info) {
        const updated = { ...m, overview_es: info.overview || m.overview_es, genres: info.genres || m.genres, media_type: info.media_type || m.media_type };
        // Actualizar UI
        setDbMovies(prev => prev.map(x => x.id === m.id ? { ...x, ...updated } : x));

        // Persistir en la BD (PUT parcial)
        try {
          await fetch(`${API_URL}/api/movies/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overview: info.overview || m.overview_es, genres: info.genres, media_type: info.media_type, tmdbId: m.tmdbId })
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

  // compute filteredDb after applyFilter is available
  const filteredDb = applyFilter(dbMovies)
    .filter(m => dbAlpha ? (m.title && m.title[0] && m.title[0].toUpperCase() === dbAlpha) : true)
    .filter(m => dbSearch ? (m.title && m.title.toLowerCase().includes(dbSearch.toLowerCase())) : true);

  return (
    <div className="home-page">
      {/* Header Navigation */}
      <NavigationMenu />

      {/* Sección de búsqueda y filtros */}
      <div className="home-page">
        {/* Header Navigation */}
        <NavigationMenu />
        {/* Sección de búsqueda y filtros */}
        <div className="search-and-filters">
          <div className="search-section">
            <SearchBar onResults={results => setSearchResults(results && results.length ? results : null)} />
          </div>
          <div className="filters-section">
            <div className="filter-bar">
              <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Todas</button>
              <button className={`filter-btn ${statusFilter === 'vista' ? 'active' : ''}`} onClick={() => setStatusFilter('vista')}>Vistas</button>
              <button className={`filter-btn ${statusFilter === 'en-proceso' ? 'active' : ''}`} onClick={() => setStatusFilter('en-proceso')}>En Proceso</button>
              <button className={`filter-btn ${statusFilter === 'pendiente' ? 'active' : ''}`} onClick={() => setStatusFilter('pendiente')}>Pendientes</button>
            </div>
          </div>
        </div>
        {/* Cuadro especial para búsqueda y filtro alfabético en la base de datos */}
        <div className="db-search-box">
          <div className="db-search-row">
            <input
              type="text"
              className="db-search-input"
              placeholder="Buscar en tu bitácora..."
              value={dbSearch}
              onChange={e => setDbSearch(e.target.value)}
              style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--accent-cyan)', background: 'rgba(0,229,255,0.07)', color: 'var(--text)', width: '100%', maxWidth: 340 }}
            />
          </div>
          <div className="db-alpha-filter">
            {[...Array(26)].map((_, i) => {
              const letter = String.fromCharCode(65 + i);
              return (
                <button
                  key={letter}
                  className={`db-alpha-btn${dbAlpha === letter ? ' active' : ''}`}
                  style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', textDecoration: dbAlpha === letter ? 'underline' : 'none', fontSize: '1.1rem', margin: '0 0.2rem', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setDbAlpha(dbAlpha === letter ? '' : letter)}
                >{letter}</button>
              );
            })}
          </div>
          <div className="db-count-row" style={{ marginTop: 10, fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>
            <span>Total: {filteredDb.length}</span> | <span>Vistas: {filteredDb.filter(m => String(m.status).toLowerCase().trim() === 'vista').length}</span> | <span>En proceso: {filteredDb.filter(m => String(m.status).toLowerCase().trim() === 'en proceso').length}</span> | <span>Pendientes: {filteredDb.filter(m => String(m.status).toLowerCase().trim() === 'pendiente').length}</span>
          </div>
        </div>
        {/* Si hay resultados de búsqueda mostrarlos y ocultar la tabla de DB */}
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
            {filteredDb.map(m => (
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
                    <button className="btn" onClick={() => navigate('/edit', { state: { movie: { ...m, _isDb: true } } })}>Editar</button>
                    <button
                      className="btn-delete"
                      title="Eliminar"
                      onClick={async () => {
                        const ok = window.confirm(`¿Eliminar "${m.title}" (${m.year}) de la bitácora? Esta acción no se puede deshacer.`);
                        if (!ok) return;
                        try {
                          const resp = await fetch(`${API_URL}/api/movies/${m.id}`, { method: 'DELETE' });
                          if (resp.ok) {
                            // optimistically remove from UI
                            setDbMovies(prev => prev.filter(x => x.id !== m.id));
                            alert('Registro eliminado');
                          } else {
                            const body = await resp.json().catch(() => ({}));
                            console.error('Error al eliminar:', body);
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
      </div>
    </div>
  );
}

export default Home;




