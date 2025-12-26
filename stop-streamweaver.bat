@echo off
echo Stopping StreamWeaver...
echo.

REM Kill all node processes
taskkill /F /IM node.exe >nul 2>&1

echo StreamWeaver stopped.
echo.
pause
