// Script simple para probar los endpoints de caché
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Probando endpoints de caché...\n');
  
  try {
    // 1. Probar endpoint básico
    console.log('1. Probando endpoint básico...');
    const basicResponse = await fetch(`${BASE_URL}/`);
    const basicText = await basicResponse.text();
    console.log('✅ Respuesta básica:', basicText);
    
    // 2. Probar estado de caché
    console.log('\n2. Probando estado de caché...');
    const statusResponse = await fetch(`${BASE_URL}/api/cache/status`);
    const statusData = await statusResponse.json();
    console.log('✅ Estado de caché:', JSON.stringify(statusData, null, 2));
    
    // 3. Probar endpoint TMDB (ejemplo con película Fight Club)
    console.log('\n3. Probando endpoint TMDB (primera vez - cache MISS)...');
    const tmdbResponse1 = await fetch(`${BASE_URL}/api/tmdb/overview/550`);
    const tmdbData1 = await tmdbResponse1.json();
    console.log('✅ TMDB primera llamada:', tmdbData1);
    console.log('🏷️ Headers:', tmdbResponse1.headers.get('X-Cache-Status'));
    
    // 4. Probar mismo endpoint otra vez (debería ser cache HIT)
    console.log('\n4. Probando mismo endpoint (segunda vez - cache HIT)...');
    const tmdbResponse2 = await fetch(`${BASE_URL}/api/tmdb/overview/550`);
    const tmdbData2 = await tmdbResponse2.json();
    console.log('✅ TMDB segunda llamada:', tmdbData2);
    console.log('🏷️ Headers:', tmdbResponse2.headers.get('X-Cache-Status'));
    
    // 5. Probar bypass de caché
    console.log('\n5. Probando bypass de caché con ?nocache=1...');
    const tmdbResponse3 = await fetch(`${BASE_URL}/api/tmdb/overview/550?nocache=1`);
    const tmdbData3 = await tmdbResponse3.json();
    console.log('✅ TMDB con bypass:', tmdbData3);
    console.log('🏷️ Headers:', tmdbResponse3.headers.get('X-Cache-Status'));
    
    // 6. Verificar estado de caché nuevamente
    console.log('\n6. Verificando estado de caché después de las pruebas...');
    const statusResponse2 = await fetch(`${BASE_URL}/api/cache/status`);
    const statusData2 = await statusResponse2.json();
    console.log('✅ Estado final de caché:', JSON.stringify(statusData2, null, 2));
    
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Asegúrate de que el servidor esté corriendo en http://localhost:3000');
    }
  }
}

testEndpoints();
