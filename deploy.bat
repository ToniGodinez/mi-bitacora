@echo off
echo ========================================
echo 🚀 DEPLOYMENT SCRIPT - Mi Bitácora
echo ========================================

echo.
echo 1. Verificando dependencias...
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI no está instalado
    echo Instalando Vercel CLI...
    npm install -g vercel
)

echo ✅ Vercel CLI disponible

echo.
echo 2. Construyendo proyecto...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Error en build
    pause
    exit /b 1
)

echo ✅ Build completado

echo.
echo 3. Verificando archivos de deployment...
if not exist "vercel.json" (
    echo ❌ vercel.json no encontrado
    pause
    exit /b 1
)

if not exist "api\index.js" (
    echo ❌ API serverless function no encontrada
    pause
    exit /b 1
)

echo ✅ Archivos de configuración OK

echo.
echo 4. Iniciando deployment...
echo.
echo 📋 IMPORTANTE: Configura estas variables de entorno en Vercel:
echo.
echo DATABASE_URL=postgresql://neondb_owner:npg_9TcH0ExpkdWX@ep-red-cherry-aerqtahe-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require^&channel_binding=require
echo VITE_TMDB_API_KEY=5f9a774c4ea58c1d35759ac3a48088d4
echo TMDB_API_KEY=5f9a774c4ea58c1d35759ac3a48088d4
echo NODE_ENV=production
echo.
echo ¿Quieres continuar con el deployment? (S/N)
set /p continue="Continuar: "

if /i "%continue%" neq "S" (
    echo Deployment cancelado
    pause
    exit /b 0
)

echo.
echo 🚀 Desplegando en Vercel...
call vercel --prod

echo.
echo ========================================
echo 🎉 DEPLOYMENT COMPLETADO
echo ========================================
echo.
echo 📝 TODO: Después del deployment:
echo 1. Verifica que la app funcione en la URL de Vercel
echo 2. Confirma que las variables de entorno estén configuradas
echo 3. Prueba las optimizaciones en producción
echo 4. Monitorea el consumo de compute hours
echo.
pause
