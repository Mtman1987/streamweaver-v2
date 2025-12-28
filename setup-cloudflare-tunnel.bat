@echo off
echo Cloudflare Tunnel Setup for Voice Chat
echo ======================================
echo.
echo This script will help you set up a permanent Cloudflare tunnel for your voice server.
echo.
echo Step 1: Make sure cloudflared is installed
echo (You mentioned it's in C:\Program Files (x86)\cloudflared)
echo.

set CLOUD FLARED_PATH="C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not exist %CLOUDFLARED_PATH% (
    echo ERROR: cloudflared not found at %CLOUDFLARED_PATH%
    echo Please check the installation path and update this script.
    pause
    exit /b 1
)

echo Found cloudflared at: %CLOUDFLARED_PATH%
echo.

echo Step 2: Login to Cloudflare (if not already done)
%CLOUDFLARED_PATH% tunnel login
if %errorlevel% neq 0 (
    echo Login failed. Please try again.
    pause
    exit /b 1
)

echo.
echo Step 3: Create a tunnel named 'voice-server'
%CLOUDFLARED_PATH% tunnel create voice-server
if %errorlevel% neq 0 (
    echo Tunnel creation failed. It might already exist.
)

echo.
echo Step 4: List your tunnels to get the tunnel ID
%CLOUDFLARED_PATH% tunnel list

echo.
echo Step 5: Create tunnel configuration
echo Creating tunnel config file...
(
echo tunnel: voice-server
echo credentials-file: C:\Users\%USERNAME%\.cloudflared\voice-server.json
echo.
echo ingress:
echo   - hostname: mtman1987.stream
echo     service: http://localhost:8080
echo   - service: http_status:404
) > "C:\Users\%USERNAME%\.cloudflared\config.yml"

echo.
echo Step 6: Test the tunnel (run in another command window)
echo Command to run the tunnel:
echo %CLOUDFLARED_PATH% tunnel --config "C:\Users\%USERNAME%\.cloudflared\config.yml" run voice-server
echo.

echo Step 7: For permanent service (run as Administrator)
echo To install as a Windows service:
echo %CLOUDFLARED_PATH% service install
echo.

echo Setup complete! Your tunnel should be accessible at:
echo https://mtman1987.stream
echo.
echo Next steps:
echo 1. Run the tunnel command above in a new terminal
echo 2. Test by visiting https://mtman1987.stream/mesh_user.html
echo 3. If it works, install as a service for automatic startup
echo.
pause
