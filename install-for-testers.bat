@echo off
echo ========================================
echo StreamWeave Tester Installation
echo ========================================

echo.
echo This script prepares StreamWeave for testing
echo (AI features will be disabled for stability)
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo [2/4] Setting up build-compatible configuration...
if not exist "ai-backup" mkdir ai-backup
if exist "src\ai\genkit.ts" copy "src\ai\genkit.ts" "ai-backup\genkit.ts.original" >nul

echo // Mock AI for testing compatibility > "src\ai\genkit.ts"
echo const mockHandler = ^(^) =^> Promise.resolve^({ >> "src\ai\genkit.ts"
echo   output: { text: '{\"label\":\"Mock Node\",\"type\":\"action\",\"subtype\":\"mock\",\"data\":{}}' }, >> "src\ai\genkit.ts"
echo   media: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' } >> "src\ai\genkit.ts"
echo }^); >> "src\ai\genkit.ts"
echo. >> "src\ai\genkit.ts"
echo const mockAI = new Proxy^({}, { >> "src\ai\genkit.ts"
echo   get: ^(target, prop^) =^> { >> "src\ai\genkit.ts"
echo     if ^(prop === 'defaultModel'^) return 'mock-model'; >> "src\ai\genkit.ts"
echo     return mockHandler; >> "src\ai\genkit.ts"
echo   } >> "src\ai\genkit.ts"
echo }^); >> "src\ai\genkit.ts"
echo. >> "src\ai\genkit.ts"
echo export const ai = mockAI; >> "src\ai\genkit.ts"

echo [3/4] Creating environment file...
if not exist ".env" (
    echo # StreamWeave Configuration > .env
    echo GEMINI_API_KEY=your_api_key_here >> .env
    echo DASHBOARD_MODE=false >> .env
)

echo [4/4] Setup complete!

echo.
echo ========================================
echo StreamWeave is ready for testing!
echo ========================================
echo.
echo To run StreamWeave:
echo   npm run dev          - Development mode
echo   npm run electron:dev - Electron development
echo.
echo To restore AI features later:
echo   run restore-ai.bat
echo.
pause