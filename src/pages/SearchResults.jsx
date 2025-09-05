import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
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

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=es-MX&page=1`;
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error('TMDB error ' + res.status);
        const data = await res.json();
        if (!signal.aborted) setResults(data.results || []);
      } catch (err) {
        if (err.name === 'AbortError') {
          // petición abortada por cleanup (React Strict / navegación rápida)
          return;
        }
        console.error('Error buscando en TMDB:', err);
        setError('Error al obtener resultados');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchResults();

    return () => controller.abort();
  }, [q]);

  const openEdit = (item) => {
    // Detecta tipo y obtiene detalle completo de TMDB antes de navegar
    const fetchAndNavigate = async () => {
      let detailUrl = '';
      let type = item.media_type || (item.title ? 'movie' : (item.name ? 'tv' : ''));
      if (type === 'movie') {
        detailUrl = `https://api.themoviedb.org/3/movie/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=credits`;
      } else if (type === 'tv') {
        detailUrl = `https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=credits`;
      } else {
        // Si no es movie ni tv, navega con el objeto original
        navigate(`/edit/${item.id}`, { state: { movie: item } });
        return;
      }
      try {
        const res = await fetch(detailUrl);
        if (!res.ok) throw new Error('TMDB detalle error ' + res.status);
        const data = await res.json();
        // Mapeo robusto de campos clave
        let director = '';
        if (type === 'movie') {
          const dirObj = data.credits?.crew?.find(p => p.job === 'Director');
          director = dirObj?.name || '';
        } else if (type === 'tv') {
          director = Array.isArray(data.created_by) ? data.created_by.map(c => c.name).join(', ') : '';
        }
        let cast = '';
        if (data.credits?.cast?.length) {
          cast = data.credits.cast.slice(0, 5).map(a => a.name).join(', ');
        }
        let country = '';
        if (type === 'movie' && Array.isArray(data.production_countries) && data.production_countries.length > 0) {
          const c = data.production_countries[0];
          const countriesES = {
            'US': 'Estados Unidos', 'GB': 'Reino Unido', 'ES': 'España', 'FR': 'Francia', 'DE': 'Alemania', 'IT': 'Italia', 'JP': 'Japón', 'CN': 'China', 'RU': 'Rusia', 'MX': 'México', 'CA': 'Canadá', 'BR': 'Brasil', 'AU': 'Australia', 'KR': 'Corea del Sur',
            'United States of America': 'Estados Unidos', 'United Kingdom': 'Reino Unido', 'Spain': 'España', 'France': 'Francia', 'Germany': 'Alemania', 'Italy': 'Italia', 'Japan': 'Japón', 'China': 'China', 'Russia': 'Rusia', 'Mexico': 'México', 'Canada': 'Canadá', 'Brazil': 'Brasil', 'Australia': 'Australia', 'South Korea': 'Corea del Sur'
          };
          country = countriesES[c.iso_3166_1] || countriesES[c.name] || c.name;
        } else if (type === 'tv' && Array.isArray(data.origin_country) && data.origin_country.length > 0) {
          const countriesES = {
            'US': 'Estados Unidos', 'GB': 'Reino Unido', 'ES': 'España', 'FR': 'Francia', 'DE': 'Alemania', 'IT': 'Italia', 'JP': 'Japón', 'CN': 'China', 'RU': 'Rusia', 'MX': 'México', 'CA': 'Canadá', 'BR': 'Brasil', 'AU': 'Australia', 'KR': 'Corea del Sur'
          };
          country = data.origin_country.map(code => countriesES[code] || code).join(', ');
        }
        let genres = [];
        if (Array.isArray(data.genres)) {
          genres = data.genres.map(g => g.name);
        }
        const robustMovie = {
          id: data.id,
          tmdbId: data.id, // ✅ AGREGAR TMDB ID EXPLÍCITAMENTE
          title: data.title || data.name || '',
          year: (data.release_date || data.first_air_date || '').split('-')[0] || '',
          poster_path: data.poster_path || '',
          poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : '', // ✅ URL completa
          overview: data.overview || '',
          director,
          actors: cast,
          country,
          genres, // ✅ Ya es un array de strings
          media_type: type,
          vote_average: data.vote_average || '',
          production_companies: data.production_companies || [],
          runtime: data.runtime || data.episode_run_time?.[0] || '',
        };
        navigate(`/edit/${data.id}`, { state: { movie: robustMovie } });
      } catch (err) {
        // Si falla, navega con el objeto original
        navigate(`/edit/${item.id}`, { state: { movie: item } });
      }
    };
    fetchAndNavigate();
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Resultados para: "{q}"</h2>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}
      {!loading && results.length === 0 && <p>No se encontraron resultados.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem', marginTop: '1rem' }}>
        {results.map(r => {
          const tipo = r.media_type;
          let nombre = r.title || r.name || '—';
          let fecha = r.release_date || r.first_air_date || '';
          let imagen = FALLBACK;
          let descripcion = '';
          let extra = '';
          if (tipo === 'movie' || tipo === 'tv') {
            imagen = r.poster_path ? `${IMAGE_BASE_URL}${r.poster_path}` : FALLBACK;
            descripcion = r.overview ? (r.overview.length > 120 ? r.overview.slice(0, 120) + '…' : r.overview) : 'Sin sinopsis';
            extra = r.vote_average ? `⭐ ${r.vote_average.toFixed(1)}` : '';
          } else if (tipo === 'person') {
            imagen = r.profile_path ? `${IMAGE_BASE_URL.replace('w300','w185')}${r.profile_path}` : FALLBACK;
            descripcion = r.known_for && r.known_for.length > 0
              ? 'Conocido por: ' + r.known_for.map(k => k.title || k.name).filter(Boolean).join(', ')
              : 'Sin información';
            extra = r.known_for_department ? r.known_for_department : '';
            fecha = '';
          }
          return (
            <div key={r.id + (tipo || '')} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 10, cursor: 'pointer' }} onClick={() => openEdit(r)}>
              <img src={imagen} alt={nombre} style={{ width: '100%', borderRadius: 6, objectFit: 'cover' }} />
              <h3 style={{ margin: '0.5rem 0 0.2rem' }}>{nombre} <small style={{ opacity: 0.8 }}>({fecha?.split('-')?.[0] || '—'})</small></h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem', minHeight: '2.2rem' }}>{descripcion}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{tipo === 'person' ? 'Persona' : tipo === 'movie' ? 'Película' : tipo === 'tv' ? 'Serie' : ''}</span>
                {tipo !== 'person' && (
                  <button className="btn" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</button>
                )}
                <div style={{ color: 'var(--muted)' }}>{extra}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
