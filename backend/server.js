import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔗 Tu connection string de Neon - usar variable de entorno en production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9TcH0ExpkdWX@ep-red-cherry-aerqtahe-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

// 🧠 Ruta para guardar película
app.post('/api/movies', async (req, res) => {
  console.log('🔎 Headers recibidos:');
  console.log(req.headers);
  console.log('📌 Content-Type:', req.headers['content-type']);

  console.log('🧾 Payload recibido del frontend:');
  console.log(JSON.stringify(req.body, null, 2));

  // Extraer campos con valores por defecto
  const {
    id,
    title = 'Sin título',
    year = '',
    poster_url = '',
    rating = 0,
    comment = '',
    status = 'pendiente',
    director = '',
    actors = '',
    country = '',
    overview = '',
    media_type = 'Película',
    genres = ''
  } = req.body;

  // Validación mínima - solo verificar que el body no esté completamente vacío
  if (Object.keys(req.body).length === 0) {
    console.warn('⚠️ El body del request está vacío');
    return res.status(400).json({ error: 'Request body vacío' });
  }

  console.log('🎯 Valores a insertar en Neon:');
  console.log('title:', title);
  console.log('year:', year);
  console.log('poster_url:', poster_url);
  console.log('rating:', rating);
  console.log('comment:', comment);
  console.log('status:', status);
  console.log('director:', director);
  console.log('actors:', actors);
  console.log('country:', country);
  console.log('overview:', overview);
  console.log('media_type:', media_type);
  console.log('genres:', genres);

  try {
    // Solo verificar duplicados si tenemos título y año válidos
    if (title && title !== 'Sin título' && year) {
      const dupCheck = await pool.query(
        `SELECT * FROM movies WHERE title = $1 AND year = $2 LIMIT 1`,
        [title, year]
      );

      if (dupCheck.rows.length > 0) {
        console.warn('⚠️ Película duplicada encontrada:', dupCheck.rows[0]);
        return res.status(409).json({ 
          error: 'Película duplicada', 
          existing: dupCheck.rows[0],
          message: `La película "${title}" (${year}) ya existe en la base de datos`
        });
      }
    }

    // Convertir géneros de string a array para PostgreSQL
    let genresArray = [];
    if (genres && typeof genres === 'string') {
      genresArray = genres.split(',').map(g => g.trim()).filter(g => g);
    } else if (Array.isArray(genres)) {
      genresArray = genres;
    }

    const result = await pool.query(
      `INSERT INTO movies (
        title, year, poster_url, rating, comment, status,
        director, actors, country, overview, media_type, genres
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        title,
        year,
        poster_url,
        Number(rating) || 0,
        comment,
        status,
        director,
        actors,
        country,
        overview,
        media_type,
        genresArray
      ]
    );

    console.log('✅ Película guardada en Neon:', result.rows[0]);
    res.json({ 
      success: true, 
      movie: result.rows[0],
      message: `Película "${title}" guardada correctamente`
    });
  } catch (err) {
    console.error('❌ Error al guardar en Neon:', err);
    console.error('Error details:', err.message);
    console.error('Error code:', err.code);
    
    // Manejar diferentes tipos de errores
    if (err.code === '23505') {
      return res.status(409).json({ 
        error: 'Duplicado (constraint)', 
        detail: err.detail,
        message: 'Esta película ya existe en la base de datos'
      });
    }
    
    if (err.code === '42703') {
      return res.status(500).json({ 
        error: 'Error de columna', 
        detail: err.detail,
        message: 'Problema con la estructura de la base de datos'
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: 'Error al guardar la película: ' + err.message,
      detail: err.detail || 'Sin detalles adicionales'
    });
  }
});

// Ruta para actualizar película por id
app.put('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    year,
    poster_url,
    rating,
    comment,
    status,
    director,
    actors,
    country,
    overview
    , media_type, genres
  } = req.body;

  if (!id) return res.status(400).json({ error: 'Missing id parameter' });

  try {
    // Leer fila existente para permitir actualizaciones parciales
    const existingRes = await pool.query('SELECT * FROM movies WHERE id = $1 LIMIT 1', [id]);
    if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    const existing = existingRes.rows[0];

    const newTitle = title !== undefined ? title : existing.title;
    const newYear = year !== undefined ? year : existing.year;
    const newPoster = poster_url !== undefined ? poster_url : existing.poster_url;
    const newRating = rating !== undefined ? rating : existing.rating;
    const newComment = comment !== undefined ? comment : existing.comment;
    const newStatus = status !== undefined ? status : existing.status;
    const newDirector = director !== undefined ? director : existing.director;
    const newActors = actors !== undefined ? actors : existing.actors;
    const newCountry = country !== undefined ? country : existing.country;
    const newOverview = overview !== undefined ? overview : existing.overview;
    const newMediaType = media_type !== undefined ? media_type : existing.media_type;
    
    // Convertir géneros de string a array para PostgreSQL
    let newGenres = existing.genres;
    if (genres !== undefined) {
      if (typeof genres === 'string') {
        newGenres = genres.split(',').map(g => g.trim()).filter(g => g);
      } else if (Array.isArray(genres)) {
        newGenres = genres;
      }
    }

    const result = await pool.query(
      `UPDATE movies SET
        title = $1,
        year = $2,
        poster_url = $3,
        rating = $4,
        comment = $5,
        status = $6,
        director = $7,
        actors = $8,
        country = $9,
        overview = $10,
        media_type = $11,
        genres = $12
      WHERE id = $13
      RETURNING *`,
      [
        newTitle,
        newYear,
        newPoster,
        newRating,
        newComment,
        newStatus,
        newDirector,
        newActors,
        newCountry,
        newOverview,
        newMediaType,
        newGenres,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    console.log('🔄 Película actualizada:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al actualizar en Neon:', err);
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Duplicado (constraint)', detail: err.detail });
    }
    res.status(500).send('Error al actualizar la película');
  }
});

// Ruta para obtener todas las películas (para el Home)
app.get('/api/movies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al consultar películas:', err);
    res.status(500).json({ error: 'Error al obtener peliculas' });
  }
});

// Ruta para eliminar película por id
app.delete('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });
  try {
    const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    console.log('🗑️ Película eliminada:', result.rows[0]);
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error('❌ Error al eliminar película:', err);
    res.status(500).json({ error: 'Error al eliminar película' });
  }
});

// 🚀 Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🎬 Bitácora de Películas lista para usar!`);
});
