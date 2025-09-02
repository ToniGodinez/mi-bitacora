// Script de debugging para el filtro de géneros en el frontend
console.log('🔍 Debugging filtro de géneros...');

// 1. Probar conexión a la API de géneros
fetch('http://localhost:3000/api/movies/genres')
  .then(res => res.json())
  .then(genres => {
    console.log('✅ Géneros obtenidos desde API:', genres);
    console.log('📊 Total de géneros:', genres.length);
    
    // 2. Probar filtro específico con Drama
    return fetch('http://localhost:3000/api/movies/search?genre=Drama&page=1&limit=3');
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Resultados para filtro Drama:', data);
    console.log('📊 Total encontrado:', data.total);
    console.log('🎬 Películas:', data.rows?.map(r => r.title));
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
