@echo off
echo Starting StreamWeaver...
echo.

REM Kill any existing node processes
echo Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start WebSocket Server in background
echo Starting WebSocket Server...
start "StreamWeaver-WebSocket" cmd /k "cd /d %~dp0 && npx tsx server.ts"
timeout /t 3 /nobreak >nul

REM Start Next.js Dashboard
echo Starting Dashboard...
start "StreamWeaver-Dashboard" cmd /k "cd /d %~dp0 && set PORT=3100 && set NEXT_PUBLIC_STREAMWEAVE_PORT=3100 && npx next dev -p 3100"
timeout /t 2 /nobreak >nul

echo.
echo ====================================
echo StreamWeaver Started!
echo ====================================
echo WebSocket Server: http://localhost:8090
echo Dashboard: http://localhost:3100
echo.
echo Discord to Twitch forwarding is active.
echo.
echo Press any key to exit this window (services will keep running)...
pause >nul
