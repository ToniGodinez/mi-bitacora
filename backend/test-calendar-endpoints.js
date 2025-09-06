// 🧪 Script de prueba para verificar la funcionalidad del calendario
// Ejecutar: node test-calendar-endpoints.js

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

async function testCalendarEndpoints() {
  console.log('🧪 Iniciando pruebas del calendario...\n');

  try {
    // Test 1: Obtener todas las películas
    console.log('📋 Test 1: Obtener películas...');
    const moviesResponse = await fetch(`${API_URL}/api/movies?page=1&limit=5`);
    if (moviesResponse.ok) {
      const movies = await moviesResponse.json();
      const moviesList = Array.isArray(movies) ? movies : movies.rows || [];
      console.log(`✅ Películas obtenidas: ${moviesList.length}`);
      
      if (moviesList.length > 0) {
        const testMovie = moviesList[0];
        console.log(`🎬 Película de prueba: "${testMovie.title}" (ID: ${testMovie.id})`);
        
        // Test 2: Programar película
        console.log('\n📅 Test 2: Programar película...');
        const testDate = '2025-09-15'; // Fecha de prueba
        const scheduleResponse = await fetch(`${API_URL}/api/movies/${testMovie.id}/schedule`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduled_date: testDate })
        });
        
        if (scheduleResponse.ok) {
          console.log(`✅ Película programada para ${testDate}`);
          
          // Test 3: Verificar películas programadas
          console.log('\n📆 Test 3: Verificar películas programadas...');
          const scheduledResponse = await fetch(`${API_URL}/api/movies/scheduled`);
          if (scheduledResponse.ok) {
            const scheduled = await scheduledResponse.json();
            console.log(`✅ Fechas programadas encontradas: ${scheduled.length}`);
            
            // Test 4: Obtener películas de fecha específica
            console.log('\n🎯 Test 4: Obtener películas de fecha específica...');
            const dateResponse = await fetch(`${API_URL}/api/movies/scheduled/${testDate}`);
            if (dateResponse.ok) {
              const dateMovies = await dateResponse.json();
              console.log(`✅ Películas en ${testDate}: ${dateMovies.length}`);
              
              // Test 5: Limpiar (quitar fecha)
              console.log('\n🧹 Test 5: Limpiar fecha programada...');
              const cleanResponse = await fetch(`${API_URL}/api/movies/${testMovie.id}/schedule`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduled_date: null })
              });
              
              if (cleanResponse.ok) {
                console.log('✅ Fecha programada eliminada');
              } else {
                console.log('❌ Error al limpiar fecha');
              }
            } else {
              console.log('❌ Error al obtener películas por fecha');
            }
          } else {
            console.log('❌ Error al obtener programadas');
          }
        } else {
          console.log('❌ Error al programar película');
        }
      } else {
        console.log('⚠️ No hay películas para probar');
      }
    } else {
      console.log('❌ Error al obtener películas');
    }

    console.log('\n🎉 Pruebas completadas');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar pruebas
testCalendarEndpoints();
