@echo off
title Vantora Cold_Calling_Agent
color 0A
cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo  ============================================
echo   Vantora Cold_Calling_Agent - Local Run
echo  ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js not found.
  echo  Install LTS from https://nodejs.org then double-click RUN.cmd again.
  echo.
  pause
  exit /b 1
)

echo  Node:
node -v
echo.

if not exist ".env" (
  echo  [ERROR] Missing .env in this folder.
  echo  Copy .env.example to .env and add your VAPI keys.
  echo.
  pause
  exit /b 1
)

if not exist "web\node_modules\" (
  echo  Installing dependencies ^(first run only^)...
  pushd web
  call npm install
  if errorlevel 1 (
    echo  [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
  echo.
)

echo  [1/3] Syncing web env from root .env...
call node scripts\sync-web-env.js
if errorlevel 1 (
  echo  [WARN] Env sync failed - check root .env keys.
)

echo  [2/3] Ensuring demo recordings ^(skip if already present^)...
if not exist "web\public\call-archive\audio\demo-web-006.wav" (
  call node scripts\seed-demo-calls.js
) else (
  echo  Demo archive already present.
)

echo  [3/3] Starting Next.js...
echo  Chrome opens ONLY after homepage is fully compiled ^(not before^).
echo  Archive pull runs in the background so startup is not blocked.
echo  Close this window to stop the server.
echo.

REM Background archive — does not delay browser open
start "Vantora archive sync" /MIN cmd /c "node scripts\archive-quick.js >nul 2>&1"

call scripts\run-dev.cmd
echo.
pause
