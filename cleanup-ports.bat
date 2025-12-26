@echo off
echo StreamWeaver Port Cleanup
echo.
echo Killing Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo Killing Electron processes...
taskkill /F /IM electron.exe /T >nul 2>&1
echo.
echo Cleaning up specific ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3100') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8090') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do taskkill /F /PID %%a >nul 2>&1
echo.
echo Waiting for ports to be released...
timeout /t 3 /nobreak >nul
echo.
echo Cleanup complete!
echo You can now start the application safely.
pause