import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const testExactRating = async (rating) => {
  const ratingValue = parseInt(rating);
  let query = 'SELECT COUNT(*) as count FROM movies WHERE ';
  
  if (ratingValue === 0) {
    // Sin rating - solo NULL
    query += "rating IS NULL";
  } else {
    // Coincidencia exacta
    query += `rating = '${ratingValue}'`;
  }
  
  console.log(`Rating ${rating} - Query: ${query}`);
  try {
    const res = await pool.query(query);
    console.log(`Resultado: ${res.rows[0].count} películas`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
  console.log('---');
};

const main = async () => {
  console.log('PRUEBA FILTRO CON COINCIDENCIAS EXACTAS:');
  console.log('');
  
  // Primero verificar distribución real
  console.log('DISTRIBUCIÓN REAL EN BASE DE DATOS:');
  const dist = await pool.query('SELECT rating, COUNT(*) as count FROM movies GROUP BY rating ORDER BY rating');
  dist.rows.forEach(row => console.log(`Rating ${row.rating === null ? 'NULL' : row.rating}: ${row.count} películas`));
  console.log('');
  
  console.log('RESULTADOS DEL FILTRO:');
  for (const rating of [0, 1, 2, 3, 4, 5]) {
    await testExactRating(rating);
  }
  process.exit();
};

main();
