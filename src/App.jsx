import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EditMovie from './pages/EditMovie.jsx';
import SearchResults from './pages/SearchResults.jsx';
import RecommendMovie from './pages/RecommendMovie.jsx';
import UpdateMovie from './pages/UpdateMovie.jsx';

const App = () => {
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
