@echo off
title StockFlow - iniciar
rem ============================================================
rem StockFlow - inicializacao MANUAL (de dois cliques)
rem
rem Sobe o backend (porta 3002) e o frontend (porta 5173), espera os dois
rem ficarem prontos e abre o navegador em https://localhost:5173.
rem Se algum ja estiver no ar, nao sobe de novo (so abre o navegador).
rem Para parar: feche as janelas "StockFlow Backend" e "StockFlow Frontend".
rem
rem Uso avancado: "iniciar.bat semnavegador" sobe tudo sem abrir o navegador.
rem ============================================================

set "RAIZ=%~dp0"
echo Iniciando o StockFlow...
echo.

powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo Subindo o backend na porta 3002...
  start "StockFlow Backend" /d "%RAIZ%backend-django" cmd /k python manage.py runserver 3002
) else (
  echo Backend ja estava no ar.
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo Subindo o frontend na porta 5173...
  start "StockFlow Frontend" /d "%RAIZ%frontend" cmd /k npm run dev
) else (
  echo Frontend ja estava no ar.
)

echo.
echo Aguardando o sistema ficar pronto...
powershell -NoProfile -Command "$t = 0; while ($t -lt 90 -and -not ((Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction SilentlyContinue) -and (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue))) { Start-Sleep -Seconds 1; $t++ }; if ($t -ge 90) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo.
  echo O sistema nao ficou pronto em 90 segundos.
  echo Veja as mensagens nas janelas "StockFlow Backend" e "StockFlow Frontend".
  pause
  exit /b 1
)

echo Pronto! Endereco: https://localhost:5173
if /i not "%~1"=="semnavegador" start "" https://localhost:5173
echo.
echo Esta janela fecha sozinha em 5 segundos.
ping -n 6 127.0.0.1 >nul
