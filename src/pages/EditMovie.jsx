import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './EditMovie.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EditMovie = () => {
  const { state } = useLocation();
  const params = useParams();
  // Detecta tipo y datos
  const movieFromState = state?.movie;
  const movieIdParam = params.id;
  const movie = movieFromState || (movieIdParam ? { id: movieIdParam } : null);

  const [details, setDetails] = useState(null);
  const [status, setStatus] = useState('pendiente');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  // Estados editables originales
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
  
  // Nuevos estados editables
  const [editableTitle, setEditableTitle] = useState('');
  const [editableYear, setEditableYear] = useState('');
  const [editableGenres, setEditableGenres] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const isDbRecord = !!movieFromState?._isDb;

  useEffect(() => {
    const fetchDetails = async () => {
      // Diccionario de países en español y códigos ISO
      const countriesES = {
        'US': 'Estados Unidos',
        'GB': 'Reino Unido',
        'ES': 'España',
        'FR': 'Francia',
        'DE': 'Alemania',
        'IT': 'Italia',
        'JP': 'Japón',
        'CN': 'China',
        'RU': 'Rusia',
        'MX': 'México',
        'CA': 'Canadá',
        'BR': 'Brasil',
        'AU': 'Australia',
        'KR': 'Corea del Sur',
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
      // Si el objeto recibido ya tiene los datos completos, úsalo directamente
      if (movieFromState && (movieFromState.overview || movieFromState.genres || movieFromState.title || movieFromState.name)) {
        const m = movieFromState;
        const data = {
          title: m.title || m.name,
          release_date: m.release_date || (m.year ? String(m.year) + '-01-01' : ''),
          poster_path: m.poster_path || null,
          poster_url: m.poster_url || ''
        };
        setDetails(data);
        // Director/creador
        let director = m.director || '';
        if (!director && Array.isArray(m.created_by) && m.created_by.length > 0) {
          director = m.created_by.map(c => c.name).join(', ');
        }
        setDirectorName(director || 'Desconocido');
        // Reparto
        let cast = m.actors || '';
        if (!cast && Array.isArray(m.cast) && m.cast.length > 0) {
          cast = m.cast.map(a => a.name).join(', ');
        }
        setCastNames(cast || '—');
        // País (robusto para tv y movie)
        let country = m.country || '';
        if (!country && Array.isArray(m.origin_country) && m.origin_country.length > 0) {
          // origin_country es array de códigos ISO (ej: ['US'])
          country = m.origin_country.map(code => countriesES[code] || code).join(', ');
        }
        if (!country && Array.isArray(m.production_countries) && m.production_countries.length > 0) {
          // production_countries es array de objetos {iso_3166_1, name}
          country = m.production_countries.map(c => countriesES[c.iso_3166_1] || countriesES[c.name] || c.name).join(', ');
        }
        setCountryName(country || 'Desconocido');
        // Géneros
        let genresArr = [];
        if (Array.isArray(m.genres) && m.genres.length > 0) {
          genresArr = m.genres.map(g => g.name || g);
        }
        console.log('🏷️ Géneros procesados:', genresArr, 'desde movieFromState:', m.genres);
        setGenres(genresArr);
        setOverviewText(m.overview || '');
        setRating(Number(m.rating) || 0);
        setComment(m.comment || '');
        setStatus(m.status || 'pendiente');
        setMediaType(m.media_type || '');
        setRuntime(m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}min` : '');
        setReleaseDate(m.release_date ? new Date(m.release_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
        // Año para mostrar debajo del título
        setReleaseDate(
          m.release_date
            ? new Date(m.release_date).getFullYear()
            : (m.year ? m.year : '')
        );
        setProductionCompanies(m.production_companies || []);
        
        // Inicializar campos editables
        setEditableTitle(m.title || m.name || '');
        setEditableYear(m.release_date ? new Date(m.release_date).getFullYear() : (m.year || ''));
        setEditableGenres(genresArr.join(', '));
        
        return;
      }
      // Si no, haz el fetch como antes
      const res = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,release_dates&language=es-ES`);
  const data = await res.json();
      setDetails(data);
      const dir = data.credits?.crew?.find(person => person.job === 'Director');
      setDirectorName(dir?.name || '');
      const cast = (data.credits?.cast || []).slice(0, 5).map(actor => actor.name).join(', ');
      setCastNames(cast);
      setGenres((data.genres || []).map(g => genresES[g.name] || g.name));
      setMediaType('Película');
      if (data.runtime) {
        const hours = Math.floor(data.runtime / 60);
        const minutes = data.runtime % 60;
        setRuntime(hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`);
      }
      if (data.release_date) {
        const date = new Date(data.release_date);
        setReleaseDate(date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }));
      }
      setProductionCompanies(data.production_companies || []);
      const countryName = data.production_countries?.[0]?.name || 'Desconocido';
      setCountryName(countriesES[countryName] || countryName);
      setCountryName(
        data.production_countries?.length > 0
          ? (countriesES[data.production_countries[0].iso_3166_1] || countriesES[data.production_countries[0].name] || data.production_countries[0].name)
          : 'Desconocido'
      );
      setOverviewText(data.overview || 'Sin descripción disponible.');
      
      // Inicializar campos editables para datos de TMDB
      setEditableTitle(data.title || '');
      setEditableYear(data.release_date ? new Date(data.release_date).getFullYear() : '');
      setEditableGenres((data.genres || []).map(g => genresES[g.name] || g.name).join(', '));
    };

    if (movie) fetchDetails();
  }, [movie]);

  if (!details) return <p>Cargando detalles...</p>;

  const guardarPelicula = async () => {
    // Build full payload for creation, asegurando tmdbId correcto
    // ✅ LÓGICA MEJORADA: Buscar TMDB ID en orden de prioridad
    let tmdbIdFinal = null;
    
    // 1. Primero intentar desde movieFromState.tmdbId (viene de SearchResults)
    if (movieFromState && movieFromState.tmdbId) {
      tmdbIdFinal = Number(movieFromState.tmdbId);
    }
    // 2. Luego desde details.id (respuesta directa de TMDB API)
    else if (details && details.id) {
      tmdbIdFinal = Number(details.id);
    }
    // 3. Como último recurso, desde movie.id SOLO si es numérico y > 1000 (IDs de TMDB)
    else if (movie && movie.id && Number(movie.id) > 1000) {
      tmdbIdFinal = Number(movie.id);
    }
    
    console.log('🔍 TMDB ID encontrado:', tmdbIdFinal, 'desde:', 
      movieFromState?.tmdbId ? 'movieFromState.tmdbId' :
      details?.id ? 'details.id' : 
      (movie?.id && Number(movie.id) > 1000) ? 'movie.id' : 'ninguno'
    );
    const fullMovieData = {
      title: editableTitle || details.title,
      year: editableYear || details.release_date?.split('-')[0] || '',
      poster_url: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : (details.poster_url || ''),
      rating: Number(rating),
      comment,
      status,
      director: directorName,
      actors: castNames,
      country: countryName,
      overview: overviewText,
      genres: editableGenres ? editableGenres.split(',').map(g => g.trim()) : genres, // ✅ Usar campos editables
      tmdbId: tmdbIdFinal
    };

    console.log('📦 Géneros a enviar:', editableGenres ? editableGenres.split(',').map(g => g.trim()) : genres);
    console.log('📦 TMDB ID a enviar:', tmdbIdFinal);
    console.log('📦 Enviando a backend (full):', fullMovieData);

    // For updating an existing DB record, ahora incluye TODOS los campos editables
    const editableData = {
      title: editableTitle,
      year: editableYear,
      rating: Number(rating),
      comment,
      status,
      director: directorName,
      actors: castNames,
      country: countryName,
      overview: overviewText,
      genres: editableGenres ? editableGenres.split(',').map(g => g.trim()) : genres
    };

    console.log('📦 Enviando a backend (editableData):', editableData);

    try {
      // If editing DB record, PUT with ALL editable fields
      if (isDbRecord && movieFromState?.id) {
        const id = movieFromState.id;
        const updateResp = await fetch(`${API_URL}/api/movies/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Ahora todos los campos son editables
            title: editableTitle || movieFromState.title,
            year: editableYear || movieFromState.year,
            poster_url: movieFromState.poster_url, // mantener poster original
            director: directorName,
            actors: castNames,
            country: countryName,
            overview: overviewText,
            genres: editableGenres ? editableGenres.split(',').map(g => g.trim()) : (movieFromState.genres || []),
            tmdbId: typeof movieFromState.tmdbId === 'number' ? movieFromState.tmdbId : (typeof movieFromState.id === 'number' ? movieFromState.id : null),
            // campos de estado
            rating: Number(rating),
            comment: comment,
            status: status
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
                body: JSON.stringify({ ...fullMovieData, tmdbId: tmdbIdFinal })
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
        {/* SECCIÓN SUPERIOR: POSTER + CAMPOS BÁSICOS */}
        <div className="edit-header">
          <img 
            className="movie-poster"
            src={details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : (details.poster_url || '')} 
            alt={details.title} 
          />
          <div className="movie-info">
            {/* TÍTULO */}
            <div className="meta-info-editable">
              <strong>TITULO</strong>
              <input
                type="text"
                className="meta-inline-input"
                value={editableTitle}
                onChange={e => setEditableTitle(e.target.value)}
                placeholder="Título de la película"
              />
            </div>
            
            {/* AÑO */}
            <div className="meta-info-editable">
              <strong>AÑO</strong>
              <input
                type="text"
                className="meta-inline-input"
                value={editableYear}
                onChange={e => setEditableYear(e.target.value)}
                placeholder="2024"
              />
            </div>
            
            {/* PAÍS */}
            <div className="meta-info-editable">
              <strong>PAIS</strong>
              <input
                type="text"
                className="meta-inline-input"
                value={countryName}
                onChange={e => setCountryName(e.target.value)}
                placeholder="País de origen"
              />
            </div>
            
            {/* TIPO */}
            <div className="meta-info-editable">
              <strong>TIPO</strong>
              <input
                type="text"
                className="meta-inline-input"
                value={mediaType}
                onChange={e => setMediaType(e.target.value)}
                placeholder="Película, Serie, etc."
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN INFERIOR: CAMPOS COMPLETOS */}
        <div className="form-fields-full">
          {/* DIRECTOR */}
          <div className="meta-info-editable">
            <strong>DIRECTOR</strong>
            <input
              type="text"
              className="meta-inline-input"
              value={directorName}
              onChange={e => setDirectorName(e.target.value)}
              placeholder="Nombre del director"
            />
          </div>
          
          {/* REPARTO */}
          <div className="meta-info-editable">
            <strong>REPARTO</strong>
            <input
              type="text"
              className="meta-inline-input"
              value={castNames}
              onChange={e => setCastNames(e.target.value)}
              placeholder="Actores principales"
            />
          </div>
          
          {/* GÉNEROS */}
          <div className="meta-info-editable">
            <strong>GENEROS</strong>
            <input
              type="text"
              className="meta-inline-input"
              value={editableGenres}
              onChange={e => setEditableGenres(e.target.value)}
              placeholder="Acción, Drama, Comedia (separados por comas)"
            />
          </div>
          
          {/* SINOPSIS */}
          <div className="meta-info-editable">
            <strong>SINOPSIS</strong>
            <textarea
              className="synopsis-inline-edit"
              value={overviewText}
              onChange={e => setOverviewText(e.target.value)}
              placeholder="Descripción de la película..."
              rows={4}
            />
          </div>
        </div>

        {/* SECCIÓN FINAL: ESTADO, RATING, OPINIÓN */}
        <div className="form-section-final">
          <div className="form-row-horizontal">
            <div className="form-group">
              <label className="form-label">ESTADO</label>
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
              <label className="form-label">RATING</label>
              <select 
                className="form-select"
                value={rating} 
                onChange={e => setRating(Number(e.target.value))}
              >
                <option value={0}>Sin rating</option>
                <option value={1}>★ (1 estrella)</option>
                <option value={2}>★★ (2 estrellas)</option>
                <option value={3}>★★★ (3 estrellas)</option>
                <option value={4}>★★★★ (4 estrellas)</option>
                <option value={5}>★★★★★ (5 estrellas)</option>
              </select>
            </div>
          </div>
          
          {/* TU OPINIÓN */}
          <div className="form-group">
            <label className="form-label">TU OPINION</label>
            <textarea
              className="form-textarea"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Escribe tu opinión sobre la película..."
              rows={4}
            />
          </div>
          
          {/* BOTÓN GUARDAR */}
          <button className="btn-save" onClick={guardarPelicula}>
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMovie;
