import React, { useState, useEffect } from 'react';
import './RatingModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RatingModal = ({ movie, isOpen, onClose, onMovieUpdated }) => {
  const [rating, setRating] = useState(movie?.rating || 0);
  const [watched, setWatched] = useState(movie?.status?.toLowerCase() === 'vista');
  const [status, setStatus] = useState(movie?.status || 'pendiente');
  const [comment, setComment] = useState(movie?.comment || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (movie) {
      setRating(movie.rating || 0);
      setWatched(movie.status?.toLowerCase() === 'vista');
      setStatus(movie.status || 'pendiente');
      setComment(movie.comment || '');
    }
  }, [movie]);

  const handleSave = async () => {
    if (!movie) return;

    setLoading(true);
    try {
      const updateData = {
        rating: rating,
        status: status,
        comment: comment
      };

      console.log('🎬 Enviando datos para actualizar:', updateData);
      console.log('🎬 URL del endpoint:', `${API_URL}/api/movies/${movie.id}`);

      const response = await fetch(`${API_URL}/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('🎬 Status de respuesta:', response.status);
      
      if (response.ok) {
        const updatedMovie = await response.json();
        console.log('✅ Película actualizada exitosamente:', updatedMovie);
        
        // Notificar al componente padre que la película fue actualizada
        if (onMovieUpdated) {
          onMovieUpdated(updatedMovie);
        }
        
        onClose();
      } else {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', response.status, errorText);
        alert(`Error al guardar cambios: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error en handleSave:', error);
      alert(`Error al guardar cambios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !movie) return null;

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rating-modal-header">
          <h3>{movie.title}</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="rating-modal-content">
          <div className="movie-poster-section">
            <img 
              src={movie.poster_url || 'https://placehold.co/200x300/222/fff?text=Sin+Imagen'} 
              alt={movie.title}
              className="modal-movie-poster"
            />
          </div>
          
          <div className="rating-section">
            <div className="movie-info">
              <h4>{movie.title}</h4>
              {movie.year && <p className="movie-year">({movie.year})</p>}
              {movie.synopsis && <p className="movie-synopsis">{movie.synopsis}</p>}
            </div>
            
            <div className="rating-controls">
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
            </div>
          </div>
        </div>
        
        <div className="rating-modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
