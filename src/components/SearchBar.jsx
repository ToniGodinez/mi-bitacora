import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TMDB_API_KEY = '5f9a774c4ea58c1d35759ac3a48088d4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w154';
const FALLBACK_IMAGE = 'https://placehold.co/154x231/222/fff?text=Sin+Imagen';

const SearchBar = ({ onResults }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const searchMovies = () => {
    const q = query.trim();
    if (!q) return;
    // navigate to search results page
    navigate(`/search?query=${encodeURIComponent(q)}`);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') searchMovies();
  };

  const handleSelect = (movie) => {
    navigate(`/edit/${movie.id}`, { state: { movie } });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <input
        className="search-input"
        type="text"
        placeholder="Buscar película..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
      />
      <button className="btn" onClick={searchMovies} style={{ marginLeft: '0.25rem' }} disabled={!query.trim() || loading}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>
    </div>
  );
};

export default SearchBar;
