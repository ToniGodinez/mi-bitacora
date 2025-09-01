@echo off
echo ========================================
echo 🚀 TESTING OPTIMIZACIONES
echo ========================================

echo.
echo 1. Testing Query Optimization...
powershell -Command "try { $r = Invoke-RestMethod 'http://localhost:3000/api/movies?page=1&limit=5'; Write-Host '   ✅ Paginacion OK - Total:' $r.total -ForegroundColor Green; Write-Host '   ✅ Filas recibidas:' $r.rows.Length -ForegroundColor Green } catch { Write-Host '   ❌ Error en paginacion' -ForegroundColor Red }"

echo.
echo 2. Testing Input Validation...
powershell -Command "try { $body = @{ title='Test Movie'; year=3000; rating=15 } | ConvertTo-Json; $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/movies' -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop } catch { if ($_.Exception.Response.StatusCode -eq 400) { Write-Host '   ✅ Validacion funciona - inputs invalidos rechazados' -ForegroundColor Green } else { Write-Host '   ❌ Error inesperado' -ForegroundColor Red } }"

echo.
echo 3. Testing Cache TMDB...
powershell -Command "try { $r = Invoke-WebRequest 'http://localhost:3000/api/tmdb/overview/500' -UseBasicParsing; Write-Host '   ✅ Cache Status:' $r.Headers['X-Cache-Status'] -ForegroundColor Green } catch { Write-Host '   ❌ Error en cache TMDB' -ForegroundColor Red }"

echo.
echo 4. Testing Valid Movie Creation...
powershell -Command "try { $body = @{ title='Optimized Test'; year=2024; rating=8.5; status='pendiente' } | ConvertTo-Json; $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/movies' -Method POST -Body $body -ContentType 'application/json'; Write-Host '   ✅ Pelicula creada OK - ID:' $r.movie.id -ForegroundColor Green } catch { Write-Host '   ❌ Error creando pelicula valida' -ForegroundColor Red }"

echo.
echo ========================================
echo 🎯 TESTS COMPLETADOS
echo ========================================
pause
