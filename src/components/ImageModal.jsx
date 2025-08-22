import React from 'react';
import './ImageModal.css';

const ImageModal = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-modal-backdrop" onClick={handleBackdropClick}>
      <div className="image-modal-content">
        <button className="image-modal-close" onClick={onClose}>
          ✕
        </button>
        <img 
          src={imageUrl} 
          alt={title}
          className="image-modal-img"
        />
        <div className="image-modal-title">{title}</div>
      </div>
    </div>
  );
};

export default ImageModal;
