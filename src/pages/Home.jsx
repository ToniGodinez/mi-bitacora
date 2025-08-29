import React, { useEffect, useState, useCallback } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const FALLBACK = 'https://placehold.co/154x231/222/fff?text=Sin+Imagen';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Stars = ({ value = 0 }) => {
  const full = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return <div className="stars">{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}</div>;
};

const Home = () => {
  const [dbMovies, setDbMovies] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dbSearch, setDbSearch] = useState('');
  const [dbAlpha, setDbAlpha] = useState('');
  const navigate = useNavigate();

  const loadDb = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies`);
      if (!res.ok) return setDbMovies([]);
      const data = await res.json();
      const movies = Array.isArray(data) ? data : (data.value || data.rows || []);
      setDbMovies(movies || []);
      fillSpanishOverviews(movies || []);
    } catch (e) {
      console.error('Error cargando DB', e);
      setDbMovies([]);
    }
  }, []);

  useEffect(() => { loadDb(); }, [loadDb]);

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

  async function fillSpanishOverviews(movies) {
    if (!Array.isArray(movies) || movies.length === 0) return;
    const toFetch = movies.filter(m => !m.overview_es && !m.genres).slice(0, 6);
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
  }

  const titleCase = s => { if (!s) return '—'; return String(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };

  const applyFilter = movies => {
    if (!Array.isArray(movies)) return [];
    if (statusFilter === 'all') return movies;
    if (statusFilter === 'vista') return movies.filter(m => String(m.status || '').toLowerCase().trim() === 'vista');
    if (statusFilter === 'en-proceso') return movies.filter(m => String(m.status || '').toLowerCase().trim() === 'en proceso');
    if (statusFilter === 'pendiente') return movies.filter(m => String(m.status || '').toLowerCase().trim() === 'pendiente');
    return movies;
  };

  const filteredDb = applyFilter(dbMovies)
    .filter(m => dbAlpha ? (m.title && m.title[0] && m.title[0].toUpperCase() === dbAlpha) : true)
    .filter(m => dbSearch ? (m.title && m.title.toLowerCase().includes(dbSearch.toLowerCase())) : true);

  return (
    <div className="home-page">
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
                          setDbMovies(prev => prev.filter(x => x.id !== m.id));
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
    </div>
  );
};

export default Home;




