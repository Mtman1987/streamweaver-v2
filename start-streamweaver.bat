@echo off
echo Starting StreamWeaver...
echo.

REM Always run from this folder
cd /d %~dp0

REM Check if already running
echo Checking current status...
netstat -ano | findstr ":3100" >nul
if %errorlevel%==0 (
    echo WARNING: Port 3100 already in use! StreamWeaver may already be running.
    echo Run stop-streamweaver.bat first, or check-status.bat to see what's running.
    pause
    exit /b 1
)

netstat -ano | findstr ":8090" >nul
if %errorlevel%==0 (
    echo WARNING: Port 8090 already in use! StreamWeaver may already be running.
    echo Run stop-streamweaver.bat first, or check-status.bat to see what's running.
    pause
    exit /b 1
)

REM Kill any existing node and cloudflared processes
echo Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Clean Next.js caches (prevents missing vendor-chunk errors on Windows)
echo Cleaning Next.js build cache...
if exist ".next" rmdir /s /q ".next" >nul 2>&1
if exist ".turbo" rmdir /s /q ".turbo" >nul 2>&1
timeout /t 1 /nobreak >nul

REM Start Voice Server in background
echo Starting Voice Server...
start "Voice-Server" cmd /k "cd /d %~dp0\discordstream && node voice-server.js"
timeout /t 2 /nobreak >nul

REM Start Cloudflare Tunnel for Voice Server (using permanent tunnel)
echo Starting Cloudflare Tunnel (permanent)...
start "Cloudflare-Tunnel" cmd /k "cloudflared tunnel --config "C:\Users\%USERNAME%\.cloudflared\config.yml" run voice-server"
timeout /t 3 /nobreak >nul

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
echo Voice Server: http://localhost:8080
echo Voice Tunnel: Check Cloudflare-Tunnel window for public URL
echo.
echo Discord to Twitch forwarding is active.
echo.
echo Press any key to exit this window (services will keep running)...
pause >nul
