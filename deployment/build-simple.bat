@echo off
echo Building LGU Chat Application - Step by Step...

echo.
echo ========================
echo Step 1: Clean Install
echo ========================
if exist node_modules (
    echo Removing old node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo Installing fresh dependencies...
call npm install

echo.
echo ========================
echo Step 2: Initialize Database
echo ========================
echo Creating data directory...
if not exist data mkdir data

echo Initializing database manually...
call node -e "require('./scripts/init-db.ts')" 2>nul || (
    echo Database initialization failed, continuing with build...
)

echo.
echo ========================
echo Step 3: Build Application
echo ========================
echo Building Next.js application...
call npm run build

if %errorLevel% neq 0 (
    echo.
    echo Build failed! Let's try to fix common issues...
    echo Installing missing dependencies...
    call npm install autoprefixer
    call npm install postcss
    echo Retrying build...
    call npm run build
)

echo.
echo ========================
echo Step 4: Prepare for IIS
echo ========================
echo Copying server file for IIS...
copy server.ts server.js

echo.
echo ========================
echo Build Process Complete!
echo ========================
echo Next steps:
echo 1. Run: deployment\setup-iis.ps1 (as Administrator)
echo 2. Run: deployment\deploy.bat
echo 3. Start IIS site
echo.
pause 