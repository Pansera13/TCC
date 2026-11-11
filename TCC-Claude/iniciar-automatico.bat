@echo off
rem ============================================================
rem StockFlow - inicializacao AUTOMATICA (roda ao entrar no Windows)
rem
rem Sobe o backend (porta 3002) e o frontend (porta 5173) em janelas
rem minimizadas. Nao abre o navegador e nao mexe em nenhum outro .bat.
rem Se um dos servidores ja estiver no ar, nao sobe de novo.
rem Para parar: feche as janelas "StockFlow Backend" e "StockFlow Frontend".
rem ============================================================

set "RAIZ=%~dp0"

rem Espera ~15 s para o Windows terminar de carregar a area de trabalho e a rede
ping -n 16 127.0.0.1 >nul

powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 start "StockFlow Backend" /min /d "%RAIZ%backend-django" cmd /k python manage.py runserver 3002

powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 start "StockFlow Frontend" /min /d "%RAIZ%frontend" cmd /k npm run dev
