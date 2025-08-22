import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EditMovie from './pages/EditMovie.jsx';
import SearchResults from './pages/SearchResults.jsx';
import RecommendMovie from './pages/RecommendMovie.jsx';
import UpdateMovie from './pages/UpdateMovie.jsx';

const App = () => {
  // 🚀 Keep-alive para mantener el backend activo
  useEffect(() => {
    const keepBackendAlive = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/movies`)
        .catch(() => {}); // Ignoramos errores silenciosamente
    };

    // Ping inicial después de 1 minuto
    const initialTimeout = setTimeout(keepBackendAlive, 60000);
    
    // Ping cada 10 minutos después del inicial
    const interval = setInterval(keepBackendAlive, 10 * 60 * 1000);

    // Cleanup al desmontar el componente
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <main style={{ padding: '2rem', backgroundColor: '#07090b', minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/edit" element={<EditMovie />} />
        <Route path="/edit/:id" element={<EditMovie />} />
        <Route path="/recomendacion" element={<RecommendMovie />} />
        <Route path="/actualizacion" element={<UpdateMovie />} />
      </Routes>
    </main>
  );
};

export default App;
