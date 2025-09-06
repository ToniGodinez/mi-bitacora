// 🧪 Script para probar conexión desde el frontend
// Abrir en DevTools del navegador y ejecutar

const testFrontendConnection = async () => {
  const API_URL = 'http://localhost:3000';
  
  try {
    console.log('🧪 Probando conexión desde frontend...');
    
    // Test 1: Obtener películas
    const moviesResponse = await fetch(`${API_URL}/api/movies?page=1&limit=1`);
    if (moviesResponse.ok) {
      const movies = await moviesResponse.json();
      const moviesList = Array.isArray(movies) ? movies : movies.rows || [];
      console.log('✅ Conexión a /api/movies OK');
      
      if (moviesList.length > 0) {
        const testMovie = moviesList[0];
        console.log(`🎬 Película de prueba: ${testMovie.title} (ID: ${testMovie.id})`);
        
        // Test 2: Probar endpoint de schedule
        const testDate = '2025-09-06';
        const scheduleResponse = await fetch(`${API_URL}/api/movies/${testMovie.id}/schedule`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scheduled_date: testDate }),
        });
        
        if (scheduleResponse.ok) {
          console.log('✅ Endpoint de schedule funciona OK');
        } else {
          console.error('❌ Error en schedule:', scheduleResponse.status);
        }
      }
    } else {
      console.error('❌ Error al obtener películas:', moviesResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
};

// Ejecutar test
testFrontendConnection();
