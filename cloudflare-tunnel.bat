@echo off
echo Setting up Cloudflare Tunnel for Voice Server...
echo.
echo 1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
echo 2. Login: cloudflared tunnel login
echo 3. Create tunnel: cloudflared tunnel create voice-server
echo 4. Run: cloudflared tunnel --url http://localhost:8080
echo.
echo This will give you a permanent *.trycloudflare.com URL
pause