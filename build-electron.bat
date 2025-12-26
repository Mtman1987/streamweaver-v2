@echo off
echo ========================================
echo StreamWeave Electron Build Script
echo ========================================

echo.
echo [1/5] Backing up AI files...
if not exist "ai-backup" mkdir ai-backup
copy "src\ai\genkit.ts" "ai-backup\genkit.ts.original" >nul
if exist "src\ai\dev.ts.bak" (
    copy "src\ai\dev.ts.bak" "ai-backup\dev.ts.original" >nul
) else (
    copy "src\ai\dev.ts" "ai-backup\dev.ts.original" >nul
    move "src\ai\dev.ts" "src\ai\dev.ts.bak" >nul
)

echo [2/5] Creating build-compatible AI mock...
echo // Mock AI for build compatibility > "src\ai\genkit.ts"
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

echo [3/5] Building Next.js app...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed! Restoring AI files...
    goto restore_ai
)

echo [4/5] Building Electron app...
call npm run electron:pack
if %errorlevel% neq 0 (
    echo Electron build failed! Restoring AI files...
    goto restore_ai
)

echo [5/5] Build completed successfully!
echo Executable created in: dist\win-unpacked\StreamWeave Dashboard.exe

:restore_ai
echo.
echo Restoring original AI files...
copy "ai-backup\genkit.ts.original" "src\ai\genkit.ts" >nul
if exist "ai-backup\dev.ts.original" (
    copy "ai-backup\dev.ts.original" "src\ai\dev.ts" >nul
    if exist "src\ai\dev.ts.bak" del "src\ai\dev.ts.bak" >nul
)

echo.
echo ========================================
echo Build process complete!
echo ========================================
pause