@echo off
echo ========================================
echo   Setup IIS Sub-Application for LGU Chat
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set SITE_NAME=Default Web Site
set APP_NAME=lgu-chat

echo.
echo This will create LGU Chat as a sub-application under your existing site
echo.
echo Configuration:
echo - Main site: %SITE_NAME% (your Laravel apps)
echo - Sub-app: /%APP_NAME% (LGU Chat)
echo - URL: http://192.168.32.6/%APP_NAME%
echo.

echo Checking if main site exists...
%windir%\system32\inetsrv\appcmd list site "%SITE_NAME%"
if errorlevel 1 (
    echo ERROR: Main site '%SITE_NAME%' not found
    echo Available sites:
    %windir%\system32\inetsrv\appcmd list sites
    pause
    exit /b 1
)

echo.
echo Creating application under existing site...
%windir%\system32\inetsrv\appcmd add app /site.name:"%SITE_NAME%" /path:"/%APP_NAME%" /physicalPath:"%TARGET_DIR%"
if errorlevel 1 (
    echo WARNING: Application might already exist, trying to update...
    %windir%\system32\inetsrv\appcmd set app "%SITE_NAME%/%APP_NAME%" /physicalPath:"%TARGET_DIR%"
)

echo.
echo Creating application pool for Node.js...
%windir%\system32\inetsrv\appcmd add apppool /name:"%APP_NAME%-pool"
%windir%\system32\inetsrv\appcmd set apppool "%APP_NAME%-pool" /processModel.identityType:ApplicationPoolIdentity
%windir%\system32\inetsrv\appcmd set apppool "%APP_NAME%-pool" /managedRuntimeVersion:""

echo.
echo Assigning application pool...
%windir%\system32\inetsrv\appcmd set app "%SITE_NAME%/%APP_NAME%" /applicationPool:"%APP_NAME%-pool"

echo.
echo Setting up web.config for proxy...
cd /d "%TARGET_DIR%"
if exist web.config (
    copy web.config web.config.backup
    echo Backed up existing web.config
)

echo Creating proxy web.config...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="LGU Chat Proxy" stopProcessing="true"^>
echo           ^<match url=".*" /^>
echo           ^<action type="Rewrite" url="http://localhost:3000/{R:0}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo.
echo Configuration complete!
echo.
echo Next steps:
echo 1. Start your Node.js server: node server.js
echo 2. Access via: http://192.168.32.6/%APP_NAME%
echo.
echo Your Laravel apps will still work on: http://192.168.32.6/
echo.
pause 