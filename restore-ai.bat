@echo off
echo ========================================
echo StreamWeave AI Restore Script
echo ========================================

echo.
echo This script restores full AI functionality to StreamWeave
echo.

if not exist "ai-backup\genkit.ts.original" (
    echo Error: No AI backup found!
    echo Please ensure you have the original genkit.ts file.
    pause
    exit /b 1
)

echo [1/3] Restoring AI genkit configuration...
copy "ai-backup\genkit.ts.original" "src\ai\genkit.ts" >nul

echo [2/3] Restoring AI dev configuration...
if exist "ai-backup\dev.ts.original" (
    copy "ai-backup\dev.ts.original" "src\ai\dev.ts" >nul
    if exist "src\ai\dev.ts.bak" del "src\ai\dev.ts.bak" >nul
)

echo [3/3] Cleaning up backup files...
if exist "ai-backup" rmdir /s /q "ai-backup"

echo.
echo ========================================
echo AI functionality restored!
echo ========================================
echo.
echo To enable AI features:
echo 1. Add your GEMINI_API_KEY to .env file
echo 2. Run: npm run dev
echo.
echo Note: You'll need to rebuild if you want 
echo AI features in the Electron executable.
echo.
pause