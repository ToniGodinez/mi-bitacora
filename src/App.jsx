import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EditMovie from './pages/EditMovie.jsx';
import SearchResults from './pages/SearchResults.jsx';
import RecommendMovie from './pages/RecommendMovie.jsx';
import UpdateMovie from './pages/UpdateMovie.jsx';
import Layout from './components/Layout.jsx';
import Login from './components/Login.jsx';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🔐 Verificar autenticación
  useEffect(() => {
    const checkAuthentication = () => {
      const authenticated = localStorage.getItem('authenticated');
      const loginTime = localStorage.getItem('loginTime');
      const currentTime = Date.now();
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 horas
      
      if (authenticated === 'true' && loginTime && (currentTime - loginTime < sessionDuration)) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('authenticated');
        localStorage.removeItem('loginTime');
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuthentication();
  }, []);

  // � Keep-alive opcional: solo ejecutar si VITE_ENABLE_KEEP_ALIVE === 'true'
  useEffect(() => {
    const ENABLE_KEEP_ALIVE = import.meta.env.VITE_ENABLE_KEEP_ALIVE === 'true';
    if (!ENABLE_KEEP_ALIVE) return; // evitar ping automático por defecto

    const keepAlive = () => {
      fetch(`${import.meta.env.VITE_API_URL || 'https://tonyonly-backend.onrender.com'}/api/movies`)
        .catch(() => {}); // Ignoramos errores silenciosamente
    };

    // Ping inmediato al cargar la app (solo si está habilitado)
    keepAlive();
    
    // Ping cada 10 minutos para mantener activo el backend
    const interval = setInterval(keepAlive, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // �🔑 Manejar login exitoso
  const handleLogin = (success) => {
    setIsAuthenticated(success);
  };

  // 🚪 Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('loginTime');
    setIsAuthenticated(false);
  };

  // ⏳ Pantalla de carga
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#00ffff',
        fontFamily: 'Roboto, sans-serif',
        fontSize: '1.2rem'
      }}>
        🔄 Verificando sesión...
      </div>
    );
  }

  // 🔐 Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <main style={{ padding: '2rem', backgroundColor: '#07090b', minHeight: '100vh' }}>
      {/* 🚪 Botón de logout */}
      <button 
        onClick={logout}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '0.8rem 1.5rem',
          background: 'linear-gradient(45deg, #003366, #006699)',
          color: '#00ffff',
          border: '2px solid #00ffff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'Roboto, sans-serif',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
          transition: 'all 0.3s ease',
          zIndex: 10000
        }}
        onMouseOver={(e) => {
          e.target.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
          e.target.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
        }}
        onMouseOut={(e) => {
          e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
          e.target.style.textShadow = 'none';
        }}
      >
        🚪 Salir
      </button>

      {/* Keep-alive y resto de la funcionalidad */}
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

// Cambio leve IA para forzar deploy
// Commit automático generado por IA para forzar deploy
export default App;
