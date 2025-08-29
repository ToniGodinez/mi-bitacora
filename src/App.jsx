import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EditMovie from './pages/EditMovie.jsx';
import SearchResults from './pages/SearchResults.jsx';
import RecommendMovie from './pages/RecommendMovie.jsx';
import UpdateMovie from './pages/UpdateMovie.jsx';
import Layout from './components/Layout.jsx';

const App = () => {
  // 🚀 Keep-alive para mantener el backend activo (evita cold starts)
    // App principal (modificado para commit)
  useEffect(() => {
    const keepAlive = () => {
      fetch(`${import.meta.env.VITE_API_URL || 'https://tonyonly-backend.onrender.com'}/api/movies`)
        .catch(() => {}); // Ignoramos errores silenciosamente
    };

    // Ping inmediato al cargar la app
    keepAlive();
    
    // Ping cada 10 minutos para mantener activo el backend
    const interval = setInterval(keepAlive, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ padding: '2rem', backgroundColor: '#07090b', minHeight: '100vh' }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/edit" element={<EditMovie />} />
          <Route path="/edit/:id" element={<EditMovie />} />
          <Route path="/recomendacion" element={<RecommendMovie />} />
          <Route path="/actualizacion" element={<UpdateMovie />} />
        </Route>
      </Routes>
    </main>
  );
};

export default App;
