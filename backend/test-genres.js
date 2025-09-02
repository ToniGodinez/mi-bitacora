import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:MaestroZ12@localhost:5432/bitacora_cine',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testGenres() {
  try {
    console.log('🔍 Probando consulta de géneros...');
    
    // 1. Probar consulta de géneros únicos
    const result = await pool.query(`
      SELECT DISTINCT unnest(genres) as genre 
      FROM movies 
      WHERE genres IS NOT NULL AND array_length(genres, 1) > 0
      ORDER BY genre
    `);
    
    console.log('✅ Géneros encontrados:', result.rows.length);
    console.log('📋 Primeros 10 géneros:', result.rows.slice(0, 10).map(r => r.genre));
    
    // 2. Verificar estructura de datos de géneros
    console.log('\n🔍 Verificando estructura de datos de géneros...');
    const sampleResult = await pool.query(`
      SELECT id, title, genres FROM movies 
      WHERE genres IS NOT NULL AND array_length(genres, 1) > 0
      LIMIT 3
    `);
    
    console.log('📋 Ejemplo de estructura de géneros:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ${row.title}: ${JSON.stringify(row.genres)} (tipo: ${typeof row.genres})`);
    });
    
    // 3. Probar filtro por género específico
    if (result.rows.length > 0) {
      const testGenre = result.rows[0].genre;
      console.log(`\n🔍 Probando filtro por género "${testGenre}"...`);
      
      const filterResult = await pool.query(`
        SELECT title, genres FROM movies 
        WHERE genres ? $1 
        LIMIT 5
      `, [testGenre]);
      
      console.log(`✅ Películas con género "${testGenre}":`, filterResult.rows.length);
      filterResult.rows.forEach(row => console.log(`  - ${row.title}: ${JSON.stringify(row.genres)}`));
    }
    
    // 4. Verificar si hay problemas con caracteres especiales
    console.log('\n🔍 Verificando géneros con caracteres especiales...');
    const specialCharsResult = await pool.query(`
      SELECT DISTINCT unnest(genres) as genre 
      FROM movies 
      WHERE genres IS NOT NULL 
      AND unnest(genres) LIKE '%ó%' OR unnest(genres) LIKE '%í%' OR unnest(genres) LIKE '%ñ%'
      ORDER BY genre
    `);
    
    console.log('📋 Géneros con caracteres especiales:', specialCharsResult.rows.map(r => r.genre));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await pool.end();
  }
}

testGenres();
