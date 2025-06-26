@echo off
title Deploy LGU-Chat Production Server
echo ========================================
echo   LGU-Chat Production Deployment
echo ========================================
echo.

REM Stop existing server
echo 1. Stopping existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Set production environment
echo 2. Setting production environment...
set NODE_ENV=production

REM Install production dependencies
echo 3. Installing production dependencies...
call npm ci --only=production
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Build the application
echo 4. Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Build failed
    pause
    exit /b 1
)

REM Backup existing database
echo 5. Backing up existing database...
if exist "data\localchat.db" (
    copy "data\localchat.db" "data\localchat.db.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%"
    echo Database backed up successfully
) else (
    echo No existing database found, will create new one
)

REM Initialize database with production settings
echo 6. Initializing database...
npx tsx scripts/init-db.ts
if %ERRORLEVEL% neq 0 (
    echo Error: Database initialization failed
    pause
    exit /b 1
)

REM Copy production server
echo 7. Deploying production server...
copy "deployment\production-server.js" "server-production.js"

REM Copy environment file
copy "deployment\production.env" ".env.production"

REM Update IIS site to use production server
echo 8. Updating IIS configuration...
powershell -ExecutionPolicy Bypass -Command "& { Import-Module WebAdministration; Set-ItemProperty 'IIS:\Sites\lgu-chat' -Name physicalPath -Value '%CD%'; Set-WebConfigurationProperty -PSPath 'IIS:\Sites\lgu-chat' -Filter 'system.webServer/iisnode' -Name 'nodeProcessCommandLine' -Value 'node server-production.js' }"

echo.
echo ========================================
echo   Production Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the production server: start-production.bat
echo 2. Change the default admin password immediately
echo 3. Remove demo users if any exist
echo.
echo Default admin credentials:
echo Username: admin
echo Password: admin123
echo.
echo IMPORTANT: Change the JWT_SECRET in production.env to a unique value!
echo.
pause 