@echo off
echo ========================================
echo   Starting LGU Chat Server (Public)
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set SERVER_PORT=3001

echo Switching to project directory...
cd /d "%TARGET_DIR%"

echo.
echo Current server info:
echo - Laravel apps: Running on port 80 (IIS)
echo - LGU Chat: Will run on port %SERVER_PORT%
echo - Access URL: http://192.168.32.6:%SERVER_PORT%
echo.

echo Checking if port %SERVER_PORT% is available...
netstat -an | findstr :%SERVER_PORT%
if not errorlevel 1 (
    echo WARNING: Port %SERVER_PORT% appears to be in use
    echo Killing any existing processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%SERVER_PORT%') do taskkill /f /pid %%a 2>nul
)

echo.
echo Setting environment variables...
set NODE_ENV=production
set PORT=%SERVER_PORT%
set HOST=0.0.0.0

echo Starting LGU Chat server...
echo.
echo Server will be accessible at:
echo - Local: http://localhost:%SERVER_PORT%
echo - Network: http://192.168.32.6:%SERVER_PORT%
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause 