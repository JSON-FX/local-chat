@echo off
title LGU-Chat Production Server
echo ========================================
echo   Starting LGU-Chat Production Server
echo ========================================
echo.

REM Check if production server exists
if not exist "server-production.js" (
    echo Error: Production server not found!
    echo Please run deploy-production.bat first
    pause
    exit /b 1
)

REM Set production environment
set NODE_ENV=production

REM Load environment variables from production.env
if exist ".env.production" (
    echo Loading production environment variables...
    for /f "usebackq tokens=1,2 delims==" %%i in (".env.production") do (
        if not "%%i"=="" if not "%%i"=="REM" if not "%%i"=="#" (
            set "%%i=%%j"
        )
    )
) else (
    echo Warning: .env.production not found, using defaults
)

REM Show server information
echo.
echo Server Configuration:
echo - Environment: %NODE_ENV%
echo - Host: %SERVER_HOST%
echo - Port: %PORT%
echo - Domain: %DOMAIN_NAME%
echo - Database: %DB_PATH%
echo.

REM Start the production server
echo Starting production server...
echo Press Ctrl+C to stop the server
echo.
node server-production.js

echo.
echo Server stopped.
pause 