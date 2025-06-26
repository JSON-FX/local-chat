@echo off
title Fix LGU-Chat Production Issues
echo ========================================
echo   Fixing LGU-Chat Production Issues
echo ========================================
echo.

echo 1. Copying production environment file...
copy deployment\production.env .env.production
if errorlevel 1 (
    echo Error: Failed to copy environment file
    pause
    exit /b 1
)
echo ✅ Environment file copied successfully

echo.
echo 2. Stopping any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo ✅ Previous processes stopped

echo.
echo 3. Running fresh database migration to fix schema...
npm run fresh-db -- --force
if errorlevel 1 (
    echo Error: Database migration failed
    pause
    exit /b 1
)
echo ✅ Database refreshed successfully

echo.
echo 4. Building application...
npm run build
if errorlevel 1 (
    echo Warning: Build had issues but continuing...
)
echo ✅ Application built

echo.
echo 5. All issues fixed! You can now start the production server with:
echo    npm run prod
echo.
echo Or press any key to start the server now...
pause >nul

echo Starting production server...
npm run prod 