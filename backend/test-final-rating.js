import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const testFinalRating = async (rating) => {
  const ratingValue = parseInt(rating);
  let query = 'SELECT COUNT(*) as count FROM movies WHERE rating = $1';
  const params = [ratingValue.toString()];
  
  console.log(`Rating ${rating} - Query: ${query} con parámetro: '${ratingValue}'`);
  try {
    const res = await pool.query(query, params);
    console.log(`Resultado: ${res.rows[0].count} películas`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
  console.log('---');
};

const main = async () => {
  console.log('PRUEBA FINAL - COINCIDENCIAS EXACTAS:');
  console.log('');
  
  for (const rating of [0, 1, 2, 3, 4, 5]) {
    await testFinalRating(rating);
  }
  process.exit();
};

main();
