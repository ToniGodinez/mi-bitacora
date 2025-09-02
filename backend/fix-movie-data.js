import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:MaestroZ12@localhost:5432/bitacora_cine',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixMovieData() {
  try {
    console.log('🔍 Buscando películas con problemas...');
    
    // 1. Buscar películas con tmdbid = 1 o géneros vacíos
    const problemMovies = await pool.query(`
      SELECT * FROM movies 
      WHERE tmdbid = 1 
         OR genres IS NULL 
         OR array_length(genres, 1) IS NULL
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log(`📋 Encontradas ${problemMovies.rows.length} películas con problemas:`);
    problemMovies.rows.forEach((movie, index) => {
      console.log(`${index + 1}. "${movie.title}" (${movie.year}) - TMDB ID: ${movie.tmdbid}, Géneros: ${JSON.stringify(movie.genres)}`);
    });
    
    // 2. Buscar específicamente "M - El vampiro de Dusseldorf"
    const vampiroMovie = await pool.query(`
      SELECT * FROM movies 
      WHERE title ILIKE '%vampiro%' 
         OR title ILIKE '%dusseldorf%' 
         OR title ILIKE '%M - %'
      ORDER BY id DESC
    `);
    
    if (vampiroMovie.rows.length > 0) {
      console.log('\n🎬 Película "M - El vampiro de Dusseldorf" encontrada:');
      const movie = vampiroMovie.rows[0];
      console.log(`📊 Estado actual:
        - ID: ${movie.id}
        - Título: ${movie.title}
        - Año: ${movie.year}
        - TMDB ID: ${movie.tmdbid}
        - Géneros: ${JSON.stringify(movie.genres)}
        - Director: ${movie.director}
        - País: ${movie.country}`);
      
      // Proponer corrección para "M" (1931)
      const correctData = {
        tmdbid: 196, // ID real de "M" (1931) en TMDB
        genres: ['Crimen', 'Drama', 'Suspenso'],
        director: 'Fritz Lang',
        country: 'Alemania'
      };
      
      console.log('\n🔧 Datos correctos sugeridos:');
      console.log(`- TMDB ID: ${correctData.tmdbid}`);
      console.log(`- Géneros: ${JSON.stringify(correctData.genres)}`);
      console.log(`- Director: ${correctData.director}`);
      console.log(`- País: ${correctData.country}`);
      
      // NOTA: Para aplicar la corrección, descomenta las siguientes líneas:
      /*
      console.log('\n🔄 Aplicando corrección...');
      const updateResult = await pool.query(`
        UPDATE movies 
        SET tmdbid = $1, genres = $2, director = $3, country = $4
        WHERE id = $5
        RETURNING *
      `, [correctData.tmdbid, correctData.genres, correctData.director, correctData.country, movie.id]);
      
      console.log('✅ Película corregida:', updateResult.rows[0]);
      */
    } else {
      console.log('\n❌ No se encontró la película "M - El vampiro de Dusseldorf"');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await pool.end();
  }
}

fixMovieData();
