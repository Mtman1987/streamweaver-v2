@echo off
echo ========================================
echo StreamWeave Simple Electron Build
echo ========================================

echo.
echo Building Electron app without Next.js build...
echo (This will use the existing .next folder if available)

echo [1/2] Installing dependencies...
call npm install

echo [2/2] Building Electron executable...
call npm run electron:pack

if %errorlevel% neq 0 (
    echo Electron build failed!
    echo.
    echo Try running: npm run dev
    echo Then in another terminal: npm run electron:dev
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Executable created in: dist\win-unpacked\StreamWeave Dashboard.exe
echo.
echo Note: This build uses development mode.
echo For production, you'll need to fix the AI build issues first.
echo.
pause