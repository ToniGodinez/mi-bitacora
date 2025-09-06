// 📅 Script para agregar la columna scheduled_date a la tabla movies
// Ejecutar: node add-scheduled-date-column.js

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addScheduledDateColumn() {
  try {
    console.log('🔍 Verificando si la columna scheduled_date ya existe...');
    
    // Verificar si la columna ya existe
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'movies' AND column_name = 'scheduled_date'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ La columna scheduled_date ya existe en la tabla movies');
      return;
    }

    console.log('📅 Agregando columna scheduled_date a la tabla movies...');
    
    // Agregar la columna scheduled_date
    await pool.query(`
      ALTER TABLE movies 
      ADD COLUMN scheduled_date DATE NULL
    `);

    console.log('✅ Columna scheduled_date agregada exitosamente');
    
    // Crear índice para mejorar performance en consultas de fechas
    console.log('🚀 Creando índice para scheduled_date...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_movies_scheduled_date 
      ON movies(scheduled_date) 
      WHERE scheduled_date IS NOT NULL
    `);

    console.log('✅ Índice creado exitosamente');
    console.log('🎬 ¡Base de datos lista para el calendario!');

  } catch (error) {
    console.error('❌ Error al agregar columna scheduled_date:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
addScheduledDateColumn();
