// Vercel serverless function para el backend
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import fetch from 'node-fetch';
import { createClient } from 'redis';

const app = express();

// 🌐 CORS más específico para producción
const allowedOrigin = process.env.FRONTEND_URL || process.env.VERCEL_URL || '*';
app.use(cors({ 
  origin: allowedOrigin,
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛡️ Middleware de validación para inputs
const validateMovieInput = (req, res, next) => {
  const { title, year, rating, comment, status } = req.body;
  
  if (title && (typeof title !== 'string' || title.length > 500)) {
    return res.status(400).json({ 
      error: 'Título inválido', 
      detail: 'El título debe ser texto y menor a 500 caracteres' 
    });
  }
  
  if (year && (isNaN(year) || year < 1800 || year > 2030)) {
    return res.status(400).json({ 
      error: 'Año inválido', 
      detail: 'El año debe estar entre 1800 y 2030' 
    });
  }
  
  if (rating && (isNaN(rating) || rating < 0 || rating > 10)) {
    return res.status(400).json({ 
      error: 'Rating inválido', 
      detail: 'El rating debe estar entre 0 y 10' 
    });
  }
  
  if (comment && (typeof comment !== 'string' || comment.length > 2000)) {
    return res.status(400).json({ 
      error: 'Comentario inválido', 
      detail: 'El comentario debe ser texto y menor a 2000 caracteres' 
    });
  }
  
  const validStatuses = ['pendiente', 'en proceso', 'vista'];
  if (status && !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ 
      error: 'Status inválido', 
      detail: 'Status debe ser: pendiente, en proceso, o vista' 
    });
  }
  
  next();
};

// 🗄️ Database connection (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🧠 Cache setup
const tmdbCache = new Map();
const TMDB_CACHE_TTL = 1000 * 60 * 60; // 1 hora

let redisClient = null;
let redisAvailable = false;

if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.connect().then(() => {
    console.log('✅ Redis conectado');
    redisAvailable = true;
  }).catch(err => {
    console.error('No se pudo conectar a Redis:', err);
    redisAvailable = false;
  });
}

// Cache functions
async function getCachedTmdb(key) {
  const now = Date.now();
  if (redisClient && redisAvailable) {
    try {
      const v = await redisClient.get(`tmdb:${key}`);
      if (!v) return null;
      const parsed = JSON.parse(v);
      if ((now - parsed.ts) < TMDB_CACHE_TTL) return parsed.data;
      await redisClient.del(`tmdb:${key}`).catch(() => {});
      return null;
    } catch (e) {
      console.error('Redis get error, falling back to memory cache', e);
    }
  }

  const cached = tmdbCache.get(key);
  if (cached && (now - cached.ts) < TMDB_CACHE_TTL) return cached.data;
  return null;
}

async function setCachedTmdb(key, data) {
  const now = Date.now();
  if (redisClient && redisAvailable) {
    try {
      await redisClient.set(`tmdb:${key}`, JSON.stringify({ ts: now, data }), { EX: Math.floor(TMDB_CACHE_TTL / 1000) });
      return;
    } catch (e) {
      console.error('Redis set error, falling back to memory cache', e);
    }
  }
  tmdbCache.set(key, { ts: now, data });
}

async function delCachedTmdb(key) {
  if (redisClient && redisAvailable) {
    try { await redisClient.del(`tmdb:${key}`); } catch (e) { /* ignore */ }
  }
  tmdbCache.delete(key);
}

// 🎬 Routes

// Root route
app.get('/', (req, res) => {
  res.json({ message: '🚀 Backend funcionando en Vercel!', optimized: true });
});

// Get movies with optimized pagination
app.get('/api/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || null;
    const limit = parseInt(req.query.limit, 10) || null;

    if (page && limit) {
      const offset = (Math.max(1, page) - 1) * limit;
      // 🚀 OPTIMIZADO: Una sola query con COUNT(*) OVER()
      const result = await pool.query(`
        SELECT *, COUNT(*) OVER() as total_count 
        FROM movies 
        ORDER BY id DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
      const cleanRows = result.rows.map(row => {
        const { total_count, ...cleanRow } = row;
        return cleanRow;
      });
      
      return res.json({ rows: cleanRows, total });
    }

    const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al consultar películas:', err);
    res.status(500).json({ error: 'Error al obtener peliculas' });
  }
});

// Create movie
app.post('/api/movies', validateMovieInput, async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Body recibido:', req.body);
  }

  let {
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
    genres = '',
    tmdbId = null
  } = req.body;

  if (typeof tmdbId === 'string') {
    tmdbId = Number(tmdbId);
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body vacío' });
  }

  try {
    if (title && title !== 'Sin título' && year) {
      const dupCheck = await pool.query(
        `SELECT * FROM movies WHERE title = $1 AND year = $2 LIMIT 1`,
        [title, year]
      );

      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Película duplicada', 
          existing: dupCheck.rows[0],
          message: `La película "${title}" (${year}) ya existe en la base de datos`
        });
      }
    }

    let genresArray = [];
    if (genres && typeof genres === 'string') {
      genresArray = genres.split(',').map(g => g.trim()).filter(g => g);
    } else if (Array.isArray(genres)) {
      genresArray = genres;
    }

    const result = await pool.query(
      `INSERT INTO movies (
        title, year, poster_url, rating, comment, status,
        director, actors, country, overview, media_type, genres, tmdbid
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        title, year, poster_url, Number(rating) || 0, comment, status,
        director, actors, country, overview, media_type, genresArray, tmdbId
      ]
    );

    try { 
      if (result.rows[0] && result.rows[0].tmdbid) 
        await delCachedTmdb(String(result.rows[0].tmdbid)); 
    } catch (e) { /* ignore */ }
    
    res.json({ 
      success: true, 
      movie: result.rows[0],
      message: `Película "${title}" guardada correctamente`
    });
  } catch (err) {
    console.error('❌ Error al guardar en Neon:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Duplicado (constraint)', detail: err.detail });
    }
    res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
  }
});

// Update movie
app.put('/api/movies/:id', validateMovieInput, async (req, res) => {
  const { id } = req.params;
  const { title, year, poster_url, rating, comment, status, director, actors, country, overview, media_type, genres, tmdbId } = req.body;

  if (!id) return res.status(400).json({ error: 'Missing id parameter' });

  try {
    const existingRes = await pool.query('SELECT * FROM movies WHERE id = $1 LIMIT 1', [id]);
    if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    const existing = existingRes.rows[0];

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
        title = $1, year = $2, poster_url = $3, rating = $4, comment = $5, status = $6,
        director = $7, actors = $8, country = $9, overview = $10, media_type = $11, 
        genres = $12, tmdbId = $13
      WHERE id = $14 RETURNING *`,
      [
        title !== undefined ? title : existing.title,
        year !== undefined ? year : existing.year,
        poster_url !== undefined ? poster_url : existing.poster_url,
        rating !== undefined ? rating : existing.rating,
        comment !== undefined ? comment : existing.comment,
        status !== undefined ? status : existing.status,
        director !== undefined ? director : existing.director,
        actors !== undefined ? actors : existing.actors,
        country !== undefined ? country : existing.country,
        overview !== undefined ? overview : existing.overview,
        media_type !== undefined ? media_type : existing.media_type,
        newGenres,
        tmdbId !== undefined ? tmdbId : existing.tmdbid,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    try { 
      if (result.rows[0] && result.rows[0].tmdbid) 
        await delCachedTmdb(String(result.rows[0].tmdbid)); 
    } catch (e) { /* ignore */ }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al actualizar en Neon:', err);
    res.status(500).send('Error al actualizar la película');
  }
});

// Delete movie
app.delete('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });
  
  try {
    const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    try { 
      if (result.rows[0] && result.rows[0].tmdbid) 
        await delCachedTmdb(String(result.rows[0].tmdbid)); 
    } catch (e) { /* ignore */ }
    
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error('❌ Error al eliminar película:', err);
    res.status(500).json({ error: 'Error al eliminar película' });
  }
});

// TMDB integration
app.get('/api/tmdb/overview/:tmdbId', async (req, res) => {
  const { tmdbId } = req.params;
  const { nocache } = req.query;
  const apiKey = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY;
  
  if (!tmdbId || !apiKey) {
    return res.status(400).json({ error: 'Falta tmdbId o apiKey' });
  }

  try {
    const key = String(tmdbId);
    
    let cached = null;
    if (nocache !== '1') {
      cached = await getCachedTmdb(key);
    }

    if (cached) {
      res.set({
        'Cache-Control': 'public, max-age=0, s-maxage=3600',
        'X-Cache-Status': 'HIT'
      });
      return res.json(cached);
    }

    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=es-ES`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('TMDB error ' + response.status);
    
    const data = await response.json();
    const payload = { 
      overview: data.overview || '', 
      title: data.title || '', 
      year: (data.release_date || '').split('-')[0],
      cached_at: new Date().toISOString()
    };
    
    if (nocache !== '1') {
      await setCachedTmdb(key, payload);
    }
    
    res.set({
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
      'X-Cache-Status': 'MISS'
    });
    res.json(payload);
  } catch (err) {
    console.error('Error TMDB overview:', err);
    res.status(500).json({ error: 'No se pudo obtener la sinopsis', detail: err.message });
  }
});

// Cache management endpoints
app.get('/api/cache/status', async (req, res) => {
  try {
    const status = {
      redis_available: redisAvailable,
      memory_cache_size: tmdbCache.size,
      ttl_hours: TMDB_CACHE_TTL / (1000 * 60 * 60),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    if (redisClient && redisAvailable) {
      try {
        const redisKeys = await redisClient.keys('tmdb:*');
        status.redis_cache_size = redisKeys.length;
      } catch (e) {
        status.redis_error = e.message;
      }
    }

    res.json(status);
  } catch (err) {
    console.error('Error en cache status:', err);
    res.status(500).json({ error: 'Error al obtener estado de caché' });
  }
});

app.delete('/api/cache/clear', async (req, res) => {
  try {
    let cleared = { memory: 0, redis: 0 };
    
    const memorySize = tmdbCache.size;
    tmdbCache.clear();
    cleared.memory = memorySize;

    if (redisClient && redisAvailable) {
      try {
        const redisKeys = await redisClient.keys('tmdb:*');
        if (redisKeys.length > 0) {
          await redisClient.del(redisKeys);
          cleared.redis = redisKeys.length;
        }
      } catch (e) {
        cleared.redis_error = e.message;
      }
    }

    res.json({ message: 'Caché limpiada exitosamente', cleared });
  } catch (err) {
    console.error('Error limpiando caché:', err);
    res.status(500).json({ error: 'Error al limpiar caché' });
  }
});

// Export for Vercel
export default app;
