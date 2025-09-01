import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// �️ OPTIMIZACIÓN: Middleware de validación para inputs
const validateMovieInput = (req, res, next) => {
  const { title, year, rating, comment, status } = req.body;
  
  // Validar título
  if (title && (typeof title !== 'string' || title.length > 500)) {
    return res.status(400).json({ 
      error: 'Título inválido', 
      detail: 'El título debe ser texto y menor a 500 caracteres' 
    });
  }
  
  // Validar año
  if (year && (isNaN(year) || year < 1800 || year > 2030)) {
    return res.status(400).json({ 
      error: 'Año inválido', 
      detail: 'El año debe estar entre 1800 y 2030' 
    });
  }
  
  // Validar rating
  if (rating && (isNaN(rating) || rating < 0 || rating > 10)) {
    return res.status(400).json({ 
      error: 'Rating inválido', 
      detail: 'El rating debe estar entre 0 y 10' 
    });
  }
  
  // Validar comentario (evitar ataques de texto masivo)
  if (comment && (typeof comment !== 'string' || comment.length > 2000)) {
    return res.status(400).json({ 
      error: 'Comentario inválido', 
      detail: 'El comentario debe ser texto y menor a 2000 caracteres' 
    });
  }
  
  // Validar status
  const validStatuses = ['pendiente', 'en proceso', 'vista'];
  if (status && !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ 
      error: 'Status inválido', 
      detail: 'Status debe ser: pendiente, en proceso, o vista' 
    });
  }
  
  next();
};

// �🔗 Tu connection string de Neon - usar variable de entorno en production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9TcH0ExpkdWX@ep-red-cherry-aerqtahe-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

// 🧠 Ruta para guardar película
app.post('/api/movies', validateMovieInput, async (req, res) => {
  // 🚀 OPTIMIZADO: Solo logs detallados en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.log('Body recibido:', req.body);
    console.log('🔎 Headers recibidos:');
    console.log(req.headers);
    console.log('📌 Content-Type:', req.headers['content-type']);
    console.log('🧾 Payload recibido del frontend:');
    console.log(JSON.stringify(req.body, null, 2));
  }

  // Extraer campos con valores por defecto
  let {
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
    genres = '',
    tmdbId = null
  } = req.body;

  // Si tmdbId llega como string, conviértelo a número
  if (typeof tmdbId === 'string') {
    tmdbId = Number(tmdbId);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Valor recibido para tmdbId:', tmdbId);
  }

  // Validación mínima - solo verificar que el body no esté completamente vacío
  if (Object.keys(req.body).length === 0) {
    console.warn('⚠️ El body del request está vacío');
    return res.status(400).json({ error: 'Request body vacío' });
  }

  if (process.env.NODE_ENV !== 'production') {
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
  }

  try {
    // Solo verificar duplicados si tenemos título y año válidos
    if (title && title !== 'Sin título' && year) {
      const dupCheck = await pool.query(
        `SELECT * FROM movies WHERE title = $1 AND year = $2 LIMIT 1`,
        [title, year]
      );

      if (dupCheck.rows.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Película duplicada encontrada:', dupCheck.rows[0]);
        }
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
        director, actors, country, overview, media_type, genres, tmdbid
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13
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
        genresArray,
        tmdbId // el valor recibido del frontend
      ]
    );

    console.log('✅ Película guardada en Neon:', result.rows[0]);
  // Invalidar cache TMDB si tiene tmdbId
  try { if (result.rows[0] && result.rows[0].tmdbid) await delCachedTmdb(String(result.rows[0].tmdbid)); } catch (e) { /* ignore */ }
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
app.put('/api/movies/:id', validateMovieInput, async (req, res) => {
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
    overview,
    media_type,
    genres,
    tmdbId
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
  const newTmdbId = tmdbId !== undefined ? tmdbId : existing.tmdbid;
    
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
        genres = $12,
        tmdbId = $13
      WHERE id = $14
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
        newTmdbId,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    // Invalidar cache TMDB si tiene tmdbId
    try { if (result.rows[0] && result.rows[0].tmdbid) await delCachedTmdb(String(result.rows[0].tmdbid)); } catch (e) { /* ignore */ }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Película actualizada:', result.rows[0]);
    }
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
// Lista de películas con paginación opcional: /api/movies?page=1&limit=20
app.get('/api/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || null;
    const limit = parseInt(req.query.limit, 10) || null;

    if (page && limit) {
      const offset = (Math.max(1, page) - 1) * limit;
      // 🚀 OPTIMIZADO: Una sola query con COUNT(*) OVER() - 50% menos queries
      const result = await pool.query(`
        SELECT *, COUNT(*) OVER() as total_count 
        FROM movies 
        ORDER BY id DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
      // Limpiar total_count de cada fila para compatibilidad
      const cleanRows = result.rows.map(row => {
        const { total_count, ...cleanRow } = row;
        return cleanRow;
      });
      
      return res.json({ rows: cleanRows, total });
    }

    // Fallback: devolver todo (compatibilidad hacia atrás)
    const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al consultar películas:', err);
    res.status(500).json({ error: 'Error al obtener peliculas' });
  }
});

// Ruta para eliminar película por id
// Ruta para obtener sinopsis en español desde TMDB usando tmdbId
import fetch from 'node-fetch';
import { createClient } from 'redis';

// Simple cache en memoria para respuestas TMDB (keyed por tmdbId)
const tmdbCache = new Map(); // key -> { ts, data }
const TMDB_CACHE_TTL = 1000 * 60 * 60; // 1 hora

// Redis client - usar si REDIS_URL está presente
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL || null;
let redisClient = null;
let redisAvailable = false;
if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.connect().then(() => {
    console.log('✅ Redis conectado');
    redisAvailable = true;
  }).catch(err => {
    console.error('No se pudo conectar a Redis:', err);
    redisAvailable = false;
  });
}

async function getCachedTmdb(key) {
  const now = Date.now();
  // Prefer Redis
  if (redisClient && redisAvailable) {
    try {
      const v = await redisClient.get(`tmdb:${key}`);
      if (!v) return null;
      const parsed = JSON.parse(v);
      if ((now - parsed.ts) < TMDB_CACHE_TTL) return parsed.data;
      // expired
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
  // Try Redis first
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

app.get('/api/tmdb/overview/:tmdbId', async (req, res) => {
  const { tmdbId } = req.params;
  const { nocache } = req.query;
  const apiKey = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY || '5f9a774c4ea58c1d35759ac3a48088d4';
  if (!tmdbId || !apiKey) {
    return res.status(400).json({ error: 'Falta tmdbId o apiKey' });
  }

  try {
    const key = String(tmdbId);
    
    // Check cache unless nocache=1
    let cached = null;
    let cacheHit = false;
    if (nocache !== '1') {
      cached = await getCachedTmdb(key);
      if (cached) {
        cacheHit = true;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🎯 Cache HIT para tmdbId: ${tmdbId}`);
        }
      }
    }

    if (cached) {
      // Set cache headers for CDN/proxy caching
      res.set({
        'Cache-Control': 'public, max-age=0, s-maxage=3600', // CDN can cache 1h
        'X-Cache-Status': 'HIT'
      });
      return res.json(cached);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔄 Cache MISS para tmdbId: ${tmdbId} (fetching from TMDB)`);
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
    
    // Save to cache unless nocache=1
    if (nocache !== '1') {
      await setCachedTmdb(key, payload);
    }
    
    // Set cache headers
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

// 🔍 Endpoint para debug de caché
app.get('/api/cache/status', async (req, res) => {
  try {
    const status = {
      redis_available: redisAvailable,
      redis_url_configured: !!REDIS_URL,
      memory_cache_size: tmdbCache.size,
      memory_cache_keys: Array.from(tmdbCache.keys()),
      ttl_hours: TMDB_CACHE_TTL / (1000 * 60 * 60),
      timestamp: new Date().toISOString()
    };

    // Si Redis está disponible, obtener info adicional
    if (redisClient && redisAvailable) {
      try {
        const redisKeys = await redisClient.keys('tmdb:*');
        status.redis_cache_size = redisKeys.length;
        status.redis_cache_keys = redisKeys;
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

// 🧹 Endpoint para limpiar caché (útil para debug)
app.delete('/api/cache/clear', async (req, res) => {
  try {
    let cleared = { memory: 0, redis: 0 };
    
    // Limpiar memoria
    const memorySize = tmdbCache.size;
    tmdbCache.clear();
    cleared.memory = memorySize;

    // Limpiar Redis si está disponible
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

    console.log('🧹 Caché limpiada:', cleared);
    res.json({ message: 'Caché limpiada exitosamente', cleared });
  } catch (err) {
    console.error('Error limpiando caché:', err);
    res.status(500).json({ error: 'Error al limpiar caché' });
  }
});

app.delete('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });
  try {
    const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
  // Invalidar cache TMDB si existe tmdbid en la fila eliminada
  try { if (result.rows[0] && result.rows[0].tmdbid) await delCachedTmdb(String(result.rows[0].tmdbid)); } catch (e) { /* ignore */ }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('🗑️ Película eliminada:', result.rows[0]);
  }
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error('❌ Error al eliminar película:', err);
    res.status(500).json({ error: 'Error al eliminar película' });
  }
});

// 🚀 Server startup
const PORT = process.env.PORT || 3000;
// Ruta raíz para mostrar mensaje amigable
app.get('/', (req, res) => {
  res.send('¡Backend funcionando correctamente! 🚀');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🎬 Bitácora de Películas lista para usar!`);
});
