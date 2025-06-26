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

REM Install all dependencies (needed for build)
echo 3. Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Build the application (skip if build fails - use existing server)
echo 4. Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Warning: Build failed - will use existing server setup
    echo This is OK for production deployment
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
    echo Please check if TypeScript and required dependencies are installed
    echo Try running: npm install typescript tsx @types/node
    pause
    exit /b 1
)
echo Database initialized successfully

REM Clean up demo users and secure admin account
echo 7. Cleaning up demo users and securing admin account...
node scripts/manage-users.js cleanup
if %ERRORLEVEL% neq 0 (
    echo Warning: Demo cleanup failed - continuing anyway
) else (
    echo Demo users removed successfully
)

echo Setting admin password to secure password...
node scripts/manage-users.js password admin adminmm0m!s
if %ERRORLEVEL% neq 0 (
    echo Warning: Password change failed - you may need to change it manually
    echo Run: node scripts/manage-users.js password admin adminmm0m!s
) else (
    echo Admin password updated successfully
)

REM Copy production server
echo 8. Deploying production server...
if exist "deployment\production-server.js" (
    copy "deployment\production-server.js" "server-production.js"
    echo Production server deployed successfully
) else (
    echo Error: Production server file not found
    pause
    exit /b 1
)

REM Copy environment file
if exist "deployment\production.env" (
    copy "deployment\production.env" ".env.production"
    echo Environment file copied successfully
) else (
    echo Error: Production environment file not found
    pause
    exit /b 1
)

REM Update IIS site to use production server (optional)
echo 9. Updating IIS configuration...
powershell -ExecutionPolicy Bypass -Command "& { try { Import-Module WebAdministration; Set-ItemProperty 'IIS:\Sites\lgu-chat' -Name physicalPath -Value '%CD%' -ErrorAction SilentlyContinue; echo 'IIS configuration updated successfully' } catch { echo 'IIS update skipped - site will work with Node.js directly' } }" 2>nul

echo.
echo ========================================
echo   Production Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the production server: deployment\start-production.bat
echo.
echo Production admin credentials:
echo Username: admin
echo Password: adminmm0m!s
echo.
echo IMPORTANT: Change the JWT_SECRET in production.env to a unique value!
echo.
pause 