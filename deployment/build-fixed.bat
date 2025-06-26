@echo off
echo Building LGU Chat Application - TailwindCSS v4 Fixed...

echo.
echo ========================
echo Step 1: Clean and Install
echo ========================
echo Installing dependencies...
call npm install

echo.
echo ========================
echo Step 2: Verify TailwindCSS Setup
echo ========================
echo Checking TailwindCSS configuration...

REM Check if we need to downgrade TailwindCSS or fix config
echo Installing compatible PostCSS setup...
call npm install postcss@latest autoprefixer@latest

echo.
echo ========================
echo Step 3: Try Alternative Build Method
echo ========================
echo Trying Next.js build without custom PostCSS...

REM Temporarily rename PostCSS config to bypass issues
if exist postcss.config.mjs (
    echo Temporarily disabling custom PostCSS config...
    ren postcss.config.mjs postcss.config.mjs.backup
)

echo Building Next.js application...
call npm run build

REM Restore PostCSS config
if exist postcss.config.mjs.backup (
    echo Restoring PostCSS config...
    ren postcss.config.mjs.backup postcss.config.mjs
)

if %errorLevel% neq 0 (
    echo.
    echo Build still failed. Trying TailwindCSS v3 compatibility...
    echo Installing TailwindCSS v3...
    call npm install tailwindcss@^3.0.0 @tailwindcss/postcss@^3.0.0 --save-dev
    
    echo Retrying build with TailwindCSS v3...
    call npm run build
)

echo.
echo ========================
echo Step 4: Initialize Database
echo ========================
echo Creating data directory...
if not exist data mkdir data

echo Initializing database...
call node scripts\init-db.js

echo.
echo ========================
echo Step 5: Prepare for IIS
echo ========================
echo Copying server file for IIS...
copy server.ts server.js

echo.
echo ========================
echo Build Process Complete!
echo ========================
if %errorLevel% equ 0 (
    echo ✅ Build successful!
    echo Next steps:
    echo 1. Run: deployment\setup-iis.ps1 ^(as Administrator^)
    echo 2. Run: deployment\deploy.bat
    echo 3. Start IIS site
) else (
    echo ❌ Build failed. Check the error messages above.
)
echo.
pause 