@echo off
echo 🧪 Probando endpoints de cache...
echo.

echo 1. Probando servidor basico...
curl -s http://localhost:3000/
echo.
echo.

echo 2. Probando estado de cache...
curl -s http://localhost:3000/api/cache/status
echo.
echo.

echo 3. Probando endpoint TMDB (cache MISS)...
curl -s -H "Accept: application/json" http://localhost:3000/api/tmdb/overview/550
echo.
echo.

echo 4. Probando mismo endpoint otra vez (cache HIT)...
curl -s -H "Accept: application/json" http://localhost:3000/api/tmdb/overview/550
echo.
echo.

echo 5. Probando bypass de cache con nocache=1...
curl -s -H "Accept: application/json" http://localhost:3000/api/tmdb/overview/550?nocache=1
echo.
echo.

echo ✅ Pruebas completadas!
pause
