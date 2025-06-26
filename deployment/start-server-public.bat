@echo off
echo ========================================
echo   Starting Node.js Server for Public Access
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat

echo.
echo Stopping any existing Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 2

echo.
echo Setting environment for public access...
set NODE_ENV=production
set SERVER_HOST=0.0.0.0
set PORT=3000
set DOMAIN_NAME=lgu-chat.lguquezon.local

echo.
echo Environment settings:
echo NODE_ENV=%NODE_ENV%
echo SERVER_HOST=%SERVER_HOST%
echo PORT=%PORT%
echo DOMAIN_NAME=%DOMAIN_NAME%

echo.
echo Starting server...
cd /d "%TARGET_DIR%"
echo Current directory: %CD%
echo.

echo Starting Node.js server with public binding...
echo Server will be accessible at:
echo - http://localhost:3000
echo - http://192.168.32.6:3000
echo - http://%DOMAIN_NAME%:3000 (if DNS works)
echo.
echo Press Ctrl+C to stop the server
echo ========================================

node server.js 