import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const testRatingFixed = async (rating) => {
  const ratingValue = parseInt(rating);
  let query = 'SELECT COUNT(*) as count FROM movies WHERE ';
  
  if (ratingValue === 0) {
    query += "(rating = '0' OR rating IS NULL)";
  } else {
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
  console.log('PRUEBA DEL FILTRO CORREGIDO:');
  for (const rating of [0, 1, 2, 3, 4, 5]) {
    await testRatingFixed(rating);
  }
  process.exit();
};

main();
