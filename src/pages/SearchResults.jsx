import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const FALLBACK = 'https://placehold.co/300x450/222/fff?text=Sin+Imagen';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const q = useQuery().get('query') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=es-ES&page=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('TMDB error ' + res.status);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Error buscando en TMDB:', err);
        setError('Error al obtener resultados');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q]);

  const openEdit = (movie) => {
    navigate('/edit', { state: { movie } });
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Resultados para: "{q}"</h2>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}
      {!loading && results.length === 0 && <p>No se encontraron resultados.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem', marginTop: '1rem' }}>
        {results.map(r => (
          <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 10, cursor: 'pointer' }} onClick={() => openEdit(r)}>
            <img src={r.poster_path ? `${IMAGE_BASE_URL}${r.poster_path}` : FALLBACK} alt={r.title} style={{ width: '100%', borderRadius: 6, objectFit: 'cover' }} />
            <h3 style={{ margin: '0.5rem 0 0.2rem' }}>{r.title} <small style={{ opacity: 0.8 }}>({r.release_date?.split('-')?.[0] || '—'})</small></h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', minHeight: '2.2rem' }}>{r.overview ? (r.overview.length > 120 ? r.overview.slice(0, 120) + '…' : r.overview) : 'Sin sinopsis'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button className="btn" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</button>
              <div style={{ color: 'var(--muted)' }}>{r.vote_average ? r.vote_average.toFixed(1) : '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
