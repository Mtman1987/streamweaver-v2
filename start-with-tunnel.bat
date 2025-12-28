@echo off
echo Starting StreamWeaver with Voice Tunnel...
echo.

REM Start ngrok tunnel for voice server
echo Starting ngrok tunnel...
start "ngrok-voice" cmd /k "ngrok start voice-server --config ngrok.yml"
timeout /t 3 /nobreak >nul

REM Start StreamWeaver normally
call start-streamweaver.bat

echo.
echo Voice server accessible at: https://spacemountain-voice.ngrok.io
echo Update your hosted mesh_user.html to use: wss://spacemountain-voice.ngrok.io