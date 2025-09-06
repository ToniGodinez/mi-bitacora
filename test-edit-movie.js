// 🧪 Test directo para verificar qué película se edita
// Ejecutar en consola del navegador

const testEditMovie = async (movieId) => {
  console.log(`🧪 Probando edición de película ID: ${movieId}`);
  
  try {
    const response = await fetch(`http://localhost:3000/api/movies?page=1&limit=1000`);
    const data = await response.json();
    const movies = Array.isArray(data) ? data : data.rows || [];
    
    const targetMovie = movies.find(m => m.id == movieId);
    console.log(`🎯 Película encontrada:`, targetMovie);
    
    if (targetMovie) {
      console.log(`✅ ID ${movieId} corresponde a: "${targetMovie.title}" (${targetMovie.year})`);
    } else {
      console.log(`❌ No se encontró película con ID ${movieId}`);
      console.log(`📋 IDs disponibles:`, movies.slice(0, 10).map(m => `${m.id}: ${m.title}`));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Probar con el ID 274
testEditMovie(274);
