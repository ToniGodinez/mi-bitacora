import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './EditMovie.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EditMovie = () => {
  const { state } = useLocation();
  const params = useParams();
  const movieFromState = state?.movie;
  const movieIdParam = params.id;
  const movie = movieFromState || (movieIdParam ? { id: movieIdParam } : null);

  const [details, setDetails] = useState(null);
  const [status, setStatus] = useState('pendiente');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  const [directorName, setDirectorName] = useState('');
  const [castNames, setCastNames] = useState('');
  const [countryName, setCountryName] = useState('');
  const [overviewText, setOverviewText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [genres, setGenres] = useState([]);
  const [mediaType, setMediaType] = useState('');
  const [runtime, setRuntime] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [productionCompanies, setProductionCompanies] = useState([]);
  const isDbRecord = !!movieFromState?._isDb;

  useEffect(() => {
    const fetchDetails = async () => {
      // Diccionario de países en español
      const countriesES = {
        'United States of America': 'Estados Unidos',
        'United Kingdom': 'Reino Unido',
        'Spain': 'España',
        'France': 'Francia',
        'Germany': 'Alemania',
        'Italy': 'Italia',
        'Japan': 'Japón',
        'China': 'China',
        'Russia': 'Rusia',
        'Mexico': 'México',
        'Canada': 'Canadá',
        'Brazil': 'Brasil',
        'Australia': 'Australia',
        'South Korea': 'Corea del Sur'
      };
      // Diccionario de géneros en español
      const genresES = {
        'Action': 'Acción',
        'Adventure': 'Aventura',
        'Animation': 'Animación',
        'Comedy': 'Comedia',
        'Crime': 'Crimen',
        'Documentary': 'Documental',
        'Drama': 'Drama',
        'Family': 'Familiar',
        'Fantasy': 'Fantasía',
        'History': 'Historia',
        'Horror': 'Terror',
        'Music': 'Música',
        'Mystery': 'Misterio',
        'Romance': 'Romance',
        'Science Fiction': 'Ciencia Ficción',
        'TV Movie': 'Película TV',
        'Thriller': 'Suspenso',
        'War': 'Guerra',
        'Western': 'Western'
      };
      // Si vinimos desde la BD, usamos esos datos y NO hacemos fetch a TMDB
      if (isDbRecord && movieFromState) {
        const m = movieFromState;
        const data = {
          title: m.title,
          release_date: m.year ? String(m.year) + '-01-01' : '',
          poster_path: null,
          poster_url: m.poster_url || ''
        };
        setDetails(data);
        setDirectorName(m.director || '');
        setCastNames(m.actors || '');
        setCountryName(countriesES[m.country] || m.country || 'Desconocido');
        setOverviewText(m.overview || '');
        setRating(Number(m.rating) || 0);
        setComment(m.comment || '');
        setStatus(m.status || 'pendiente');
        setGenres((m.genres && Array.isArray(m.genres)) ? m.genres.map(g => genresES[g] || g) : []);
        return;
      }

      // Hacer el fetch con language=es-ES para obtener todo en español
      const res = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,release_dates&language=es-ES`);
      const data = await res.json();
      setDetails(data);

      // Director
      const dir = data.credits?.crew?.find(person => person.job === 'Director');
      setDirectorName(dir?.name || '');

      // Cast principal (primeros 5)
      const cast = (data.credits?.cast || []).slice(0, 5).map(actor => actor.name).join(', ');
      setCastNames(cast);

      // Géneros traducidos
      setGenres((data.genres || []).map(g => genresES[g.name] || g.name));

      // Tipo de media y duración
      setMediaType(data.type === 'tv' ? 'Serie' : 'Película');
      if (data.runtime) {
        const hours = Math.floor(data.runtime / 60);
        const minutes = data.runtime % 60;
        setRuntime(hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`);
      }

      // Fecha de estreno formateada
      if (data.release_date) {
        const date = new Date(data.release_date);
        setReleaseDate(date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
      }

      // Compañías productoras
      setProductionCompanies(data.production_companies || []);

      // País con traducción
      const countryName = data.production_countries?.[0]?.name || 'Desconocido';
      setCountryName(countriesES[countryName] || countryName);
      
      // Sinopsis
      setOverviewText(data.overview || 'Sin descripción disponible.');
    };

    if (movie) fetchDetails();
  }, [movie]);

  if (!details) return <p>Cargando detalles...</p>;

  const guardarPelicula = async () => {
    // Build full payload for creation, but for DB-updates we'll send only editable fields
    const fullMovieData = {
      title: details.title,
      year: details.release_date?.split('-')[0] || '',
      poster_url: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : (details.poster_url || ''),
      rating: Number(rating),
      comment,
      status,
      director: directorName,
      actors: castNames,
      country: countryName,
      overview: overviewText
    };

    // For updating an existing DB record, only change rating/comment/status
    const editableOnly = {
      rating: Number(rating),
      comment,
      status
    };

  console.log('📦 Enviando a backend (full):', fullMovieData);
  console.log('📦 Enviando a backend (editableOnly):', editableOnly);

    try {
      // If editing DB record, PUT only editable fields
      if (isDbRecord && movieFromState?.id) {
        const id = movieFromState.id;
        const updateResp = await fetch(`${API_URL}/api/movies/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // keep original fields unchanged on server by sending the same values for immutable fields
            title: movieFromState.title,
            year: movieFromState.year,
            poster_url: movieFromState.poster_url,
            director: movieFromState.director,
            actors: movieFromState.actors,
            country: movieFromState.country,
            overview: movieFromState.overview,
            // editable
            rating: editableOnly.rating,
            comment: editableOnly.comment,
            status: editableOnly.status
          })
        });

        if (updateResp.ok) {
          const updated = await updateResp.json();
          alert(`Registro actualizado: ${updated.title}`);
          setRating(0);
          setComment('');
          setStatus('pendiente');
          navigate('/');
        } else {
          console.error('Error al actualizar:', updateResp.statusText);
          alert('No se pudo actualizar el registro');
        }
        return;
      }

      // Otherwise, create new record (POST)
      const response = await fetch(`${API_URL}/api/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullMovieData)
      });

      if (response.ok) {
        const savedMovie = await response.json();
        console.log('✅ Película guardada:', savedMovie);
        setRating(0);
        setComment('');
        setStatus('pendiente');
        alert(`Película guardada exitosamente: ${savedMovie.title}`);
        navigate('/');
      } else if (response.status === 409) {
        const body = await response.json();
        console.warn('⚠️ Duplicado detectado en backend:', body);
        const doUpdate = window.confirm(`La película ya existe: ${body.existing?.title || 'registro existente'}. ¿Deseas actualizar el registro existente?`);
        if (doUpdate) {
          try {
            const existingId = body.existing?.id;
            if (!existingId) {
              alert('No se encontró id del registro existente. No se puede actualizar.');
            } else {
              const updateResp2 = await fetch(`${API_URL}/api/movies/${existingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullMovieData)
              });

              if (updateResp2.ok) {
                const updated = await updateResp2.json();
                alert(`Registro actualizado: ${updated.title}`);
                setRating(0);
                setComment('');
                setStatus('pendiente');
                navigate('/');
              } else {
                console.error('Error al actualizar:', updateResp2.statusText);
                alert('No se pudo actualizar el registro');
              }
            }
          } catch (err) {
            console.error('Error de red al actualizar:', err);
            alert('Error de red al actualizar');
          }
        }
      } else {
        console.error('❌ Error al guardar:', response.statusText);
        alert('Error al guardar la película');
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
      alert('Error de red al guardar la película');
    }
  };

  return (
    <div className="edit-page">
      <div className="edit-card">
        <div className="edit-header">
          <img 
            className="movie-poster"
            src={details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : (details.poster_url || '')} 
            alt={details.title} 
          />
          <div className="movie-info">
            <h1 className="movie-title">{details.title}</h1>
            <div className="movie-date" style={{ color: '#00e5ff', fontWeight: 700, fontSize: '1.05em', marginBottom: '0.5em' }}>
              {releaseDate || (details.release_date?.split('-')[0])}
            </div>
            <div className="movie-details">
              <div className="details-grid">
                <div className="meta-info">
                  <strong>Tipo</strong>
                  <div className="meta-value">{mediaType || 'Película'}</div>
                </div>
                <div className="meta-info">
                  <strong>País</strong>
                  <div className="meta-value">{countryName || '—'}</div>
                </div>
              </div>
              <div className="meta-section">
                <div className="meta-info">
                  <strong>Director</strong>
                  <div className="meta-value">{directorName || 'Desconocido'}</div>
                </div>
                <div className="meta-info">
                  <strong>Reparto</strong>
                  <div className="meta-value">{castNames || '—'}</div>
                </div>
                <div className="meta-info">
                  <strong>Géneros</strong>
                  <div className="meta-value">
                    {genres.length > 0 ? genres.join(', ') : 'Sin información'}
                  </div>
                </div>
                {productionCompanies.length > 0 && (
                  <div className="meta-info">
                    <strong>Producción</strong>
                    <div className="meta-value">
                      {productionCompanies.map(c => c.name).join(' • ')}
                    </div>
                  </div>
                )}
              </div>
              <div className="meta-section">
                <div className="meta-info">
                  <strong>Sinopsis</strong>
                </div>
                <div className={`synopsis ${isExpanded ? 'expanded' : ''}`}>
                  {overviewText || 'Sin descripción disponible.'}
                </div>
                {overviewText && (
                  <button 
                    className="btn-more" 
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? 'Mostrar menos' : 'Mostrar más'}
                  </button>
                )}
              </div>
            </div>
            <div className="form-section">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select 
                  className="form-select"
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en proceso">En Proceso</option>
                  <option value="vista">Vista</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Calificación</label>
                <div className="stars-input">
                  {[1,2,3,4,5].map(star => (
                    <span 
                      key={star}
                      onClick={() => setRating(star)}
                    >
                      {star <= rating ? '★' : '☆'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tu opinión</label>
                <textarea
                  className="form-textarea"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Escribe tu opinión sobre la película..."
                />
              </div>
              <button className="btn-save" onClick={guardarPelicula}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditMovie;
