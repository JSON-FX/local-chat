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

REM Copy application files
echo Copying application files...
xcopy /E /I /Y "app" "%DEPLOY_PATH%\app\"
xcopy /E /I /Y "components" "%DEPLOY_PATH%\components\"
xcopy /E /I /Y "lib" "%DEPLOY_PATH%\lib\"
xcopy /E /I /Y "public" "%DEPLOY_PATH%\public\"
xcopy /E /I /Y "scripts" "%DEPLOY_PATH%\scripts\"
xcopy /E /I /Y ".next" "%DEPLOY_PATH%\.next\"

REM Copy configuration files
copy "web.config" "%DEPLOY_PATH%\"
copy "package.json" "%DEPLOY_PATH%\"
copy "package-lock.json" "%DEPLOY_PATH%\"
copy "next.config.ts" "%DEPLOY_PATH%\"
copy "server.ts" "%DEPLOY_PATH%\"
copy "tsconfig.json" "%DEPLOY_PATH%\"
copy "components.json" "%DEPLOY_PATH%\"

REM Copy the renamed server file for IIS
copy "server.ts" "%DEPLOY_PATH%\server.js"

REM Create required directories
if not exist "%DEPLOY_PATH%\data" mkdir "%DEPLOY_PATH%\data"
if not exist "%DEPLOY_PATH%\uploads" mkdir "%DEPLOY_PATH%\uploads"
if not exist "%DEPLOY_PATH%\node_modules" mkdir "%DEPLOY_PATH%\node_modules"

echo Installing production dependencies...
cd /d "%DEPLOY_PATH%"
call npm ci --only=production

echo Initializing database...
call npm run init-db

echo Deployment completed successfully!
echo Application deployed to: %DEPLOY_PATH%
pause 