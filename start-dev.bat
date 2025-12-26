@echo off
echo StreamWeaver Safe Startup
echo Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo Starting services with port management...
node startup-manager.js
if %ERRORLEVEL% NEQ 0 (
    echo Startup failed, attempting cleanup...
    npm run cleanup
    pause
    exit /b 1
)
echo All services started successfully!
pause
