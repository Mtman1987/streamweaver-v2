@echo off
echo Starting Cloudflare Tunnel for Voice Server...
echo.
echo Make sure you have cloudflared installed and authenticated
echo.
echo Running: cloudflared tunnel --url http://localhost:8080
echo This will create a tunnel to your voice server
echo.
cloudflared tunnel --url http://localhost:8080