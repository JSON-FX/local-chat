@echo off
setlocal enabledelayedexpansion

echo Deploying LGU Chat to IIS...

REM Set deployment path
set DEPLOY_PATH=C:\inetpub\wwwroot\lgu-chat

REM Create deployment directory if it doesn't exist
if not exist "%DEPLOY_PATH%" (
    echo Creating deployment directory...
    mkdir "%DEPLOY_PATH%"
)

echo Copying application files...

REM Copy application directories
if exist "app" xcopy /E /I /Y "app" "%DEPLOY_PATH%\app\"
if exist "components" xcopy /E /I /Y "components" "%DEPLOY_PATH%\components\"
if exist "lib" xcopy /E /I /Y "lib" "%DEPLOY_PATH%\lib\"
if exist "public" xcopy /E /I /Y "public" "%DEPLOY_PATH%\public\"
if exist "scripts" xcopy /E /I /Y "scripts" "%DEPLOY_PATH%\scripts\"
if exist ".next" xcopy /E /I /Y ".next" "%DEPLOY_PATH%\.next\"

REM Copy all necessary configuration files
if exist "package.json" copy "package.json" "%DEPLOY_PATH%\"
if exist "package-lock.json" copy "package-lock.json" "%DEPLOY_PATH%\"
if exist "next.config.ts" copy "next.config.ts" "%DEPLOY_PATH%\"
if exist "tailwind.config.js" copy "tailwind.config.js" "%DEPLOY_PATH%\"
if exist "postcss.config.mjs" copy "postcss.config.mjs" "%DEPLOY_PATH%\"
if exist "tsconfig.json" copy "tsconfig.json" "%DEPLOY_PATH%\"
if exist "components.json" copy "components.json" "%DEPLOY_PATH%\"
if exist "web.config" copy "web.config" "%DEPLOY_PATH%\"

REM Copy server files
if exist "server.ts" copy "server.ts" "%DEPLOY_PATH%\"
if exist "server.js" copy "server.js" "%DEPLOY_PATH%\"

REM Copy environment file
if exist "deployment\production.env" copy "deployment\production.env" "%DEPLOY_PATH%\.env"

REM Copy data directory if it exists
if exist "data" xcopy /E /I /Y "data" "%DEPLOY_PATH%\data\"

REM Create required directories
if not exist "%DEPLOY_PATH%\uploads" mkdir "%DEPLOY_PATH%\uploads"

echo Changing to deployment directory...
cd /d "%DEPLOY_PATH%"

echo Installing production dependencies...
call npm install --only=production

if !errorLevel! neq 0 (
    echo Production dependencies installation failed, trying npm install...
    call npm install
)

echo Initializing database in deployment directory...
if not exist "data" mkdir "data"
call node scripts\init-db.js

echo Deployment completed successfully!
echo Application deployed to: %DEPLOY_PATH%
echo.
echo Next steps:
echo 1. Start the IIS site in IIS Manager
echo 2. Test access at: http://lgu-chat.lguquezon.com.local
echo.
pause 