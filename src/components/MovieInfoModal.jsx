import React, { useState } from 'react';
import './MovieInfoModal.css';

const MovieInfoModal = ({ isOpen, onClose, movie }) => {
  // ✅ VALIDACIÓN CRÍTICA: No renderizar si no está abierto
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'cast', label: 'Reparto', icon: '👥' },
    { id: 'technical', label: 'Técnico', icon: '⚙️' },
    { id: 'streaming', label: 'Streaming', icon: '📺' },
    { id: 'media', label: 'Media', icon: '🎬' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-content">
            <h3>Información General</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Título:</strong> {movie?.title || 'Sin título'}
              </div>
              <div className="info-item">
                <strong>Año:</strong> {movie?.year || 'Desconocido'}
              </div>
              <div className="info-item">
                <strong>Director:</strong> {movie?.director || 'Desconocido'}
              </div>
              <div className="info-item">
                <strong>Género:</strong> {movie?.genres?.join(', ') || 'Sin especificar'}
              </div>
              <div className="info-item">
                <strong>Actores:</strong> {movie?.actors || 'Sin especificar'}
              </div>
              <div className="info-item">
                <strong>Sinopsis:</strong> 
                <p>{movie?.overview_es || movie?.overview || movie?.sinopsis || 'Sin sinopsis disponible'}</p>
              </div>
            </div>
          </div>
        );
      
      case 'cast':
        return (
          <div className="tab-content">
            <h3>Reparto y Equipo</h3>
            <div className="info-item">
              <strong>Director:</strong> {movie?.director || 'Desconocido'}
            </div>
            <div className="info-item">
              <strong>Actores principales:</strong> {movie?.actors || 'Sin información'}
            </div>
          </div>
        );
      
      case 'technical':
        return (
          <div className="tab-content">
            <h3>Información Técnica</h3>
            <div className="info-item">
              <strong>Tipo:</strong> {movie?.media_type || (movie?.is_tv ? 'Serie' : 'Película')}
            </div>
            <div className="info-item">
              <strong>Estado:</strong> {movie?.status || 'Sin especificar'}
            </div>
            <div className="info-item">
              <strong>Calificación:</strong> {movie?.rating ? `${movie.rating}/5` : 'Sin calificar'}
            </div>
          </div>
        );
      
      case 'streaming':
        return (
          <div className="tab-content">
            <h3>Dónde Ver</h3>
            {movie?.ver_online ? (
              <div className="info-item">
                <a href={movie.ver_online} target="_blank" rel="noopener noreferrer" className="streaming-link">
                  🔗 Ver Online
                </a>
              </div>
            ) : (
              <p>No hay enlaces de streaming disponibles</p>
            )}
          </div>
        );
      
      case 'media':
        return (
          <div className="tab-content">
            <h3>Media</h3>
            {movie?.poster_url ? (
              <div className="poster-container">
                <img src={movie.poster_url} alt={movie.title} className="modal-poster" />
              </div>
            ) : (
              <p>No hay imágenes disponibles</p>
            )}
          </div>
        );
      
      default:
        return <div>Selecciona una pestaña</div>;
    }
  };

  return (
    <div className="movie-info-modal-overlay" onClick={onClose}>
      <div className="movie-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="movie-info-modal-header">
          <h2>📽️ {movie?.title} {movie?.year && `(${movie.year})`}</h2>
          <button className="movie-info-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="tabs-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="tabs-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default MovieInfoModal;