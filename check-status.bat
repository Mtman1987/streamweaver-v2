@echo off
echo Checking StreamWeaver status...

echo.
echo === Port Status ===
netstat -ano | findstr ":3100" >nul
if %errorlevel%==0 (
    echo Port 3100 [Dashboard]: RUNNING
) else (
    echo Port 3100 [Dashboard]: FREE
)

netstat -ano | findstr ":8090" >nul
if %errorlevel%==0 (
    echo Port 8090 [WebSocket]: RUNNING
) else (
    echo Port 8090 [WebSocket]: FREE
)

echo.
echo === Node.js Processes ===
tasklist | findstr "node.exe" >nul
if %errorlevel%==0 (
    echo Node.js processes found:
    tasklist | findstr "node.exe"
) else (
    echo No Node.js processes running
)

echo.
pause