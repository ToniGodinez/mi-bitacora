#!/bin/bash
# Script de prueba para el filtro de géneros

echo "=== 🎬 PRUEBAS DEL FILTRO DE GÉNEROS ==="
echo

echo "1. 📋 Obteniendo lista de géneros disponibles..."
curl -s "http://localhost:3000/api/movies/genres" | head -10
echo
echo

echo "2. 🔍 Probando filtro por género 'Drama'..."
curl -s "http://localhost:3000/api/movies/search?genre=Drama&page=1&limit=2" | ConvertFrom-Json | Select-Object -ExpandProperty rows | Select-Object title, @{Name='genres';Expression={$_.genres -join ', '}}
echo

echo "3. 🔍 Probando filtro por género 'Acción'..."
curl -s "http://localhost:3000/api/movies/search?genre=Acción&page=1&limit=2" | ConvertFrom-Json | Select-Object -ExpandProperty rows | Select-Object title, @{Name='genres';Expression={$_.genres -join ', '}}
echo

echo "4. 🔍 Probando combinación de filtros (Comedia + Pendiente)..."
curl -s "http://localhost:3000/api/movies/search?genre=Comedia&status=pendiente&page=1&limit=2" | ConvertFrom-Json | Select-Object -ExpandProperty rows | Select-Object title, status, @{Name='genres';Expression={$_.genres -join ', '}}
echo

echo "5. 🔍 Probando búsqueda con texto + género..."
curl -s "http://localhost:3000/api/movies/search?q=el&genre=Drama&page=1&limit=2" | ConvertFrom-Json | Select-Object -ExpandProperty rows | Select-Object title, @{Name='genres';Expression={$_.genres -join ', '}}
echo

echo "✅ Pruebas completadas!"
