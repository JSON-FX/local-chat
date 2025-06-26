@echo off
echo ========================================
echo   Deploy LGU Chat to lgu-chat.lguquezon.local
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set DOMAIN_NAME=lgu-chat.lguquezon.local
set SERVER_IP=192.168.32.6

echo.
echo Configuration:
echo - Domain: %DOMAIN_NAME%
echo - Server IP: %SERVER_IP%
echo - Target Directory: %TARGET_DIR%
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running as administrator
) else (
    echo ❌ This script must be run as administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Step 1: Configure DNS
echo =====================
echo Adding DNS record for %DOMAIN_NAME%...

REM Add to hosts file (immediate effect)
echo %SERVER_IP% %DOMAIN_NAME% >> C:\Windows\System32\drivers\etc\hosts
echo ✅ Added to hosts file

REM Try to add DNS record (if DNS server is available)
dnscmd /recordadd lguquezon.local lgu-chat A %SERVER_IP% 2>nul
if errorlevel 1 (
    echo ⚠️  DNS server record not added (may need manual configuration)
) else (
    echo ✅ DNS server record added
)

echo.
echo Step 2: Configure IIS Site
echo ==========================

REM Remove existing site if it exists
echo Removing any existing LGU-Chat site...
%windir%\system32\inetsrv\appcmd delete site "LGU-Chat" 2>nul

REM Create new site with hostname binding
echo Creating IIS site with hostname binding...
%windir%\system32\inetsrv\appcmd add site /name:"LGU-Chat" /physicalPath:"%TARGET_DIR%" /bindings:http/*:80:%DOMAIN_NAME%

REM Configure application pool
echo Configuring application pool...
%windir%\system32\inetsrv\appcmd add apppool /name:"LGU-Chat"
%windir%\system32\inetsrv\appcmd set apppool "LGU-Chat" /managedRuntimeVersion:""
%windir%\system32\inetsrv\appcmd set site "LGU-Chat" /[path='/'].applicationPool:"LGU-Chat"

echo ✅ IIS site configured

echo.
echo Step 3: Setup Web.config for Node.js Proxy
echo ==========================================
cd /d "%TARGET_DIR%"

REM Backup existing web.config
if exist web.config (
    copy web.config web.config.backup
    echo Backed up existing web.config
)

REM Create web.config for Node.js proxy
echo Creating web.config for Node.js proxy...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="Node.js Proxy" stopProcessing="true"^>
echo           ^<match url=".*" /^>
echo           ^<conditions^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /^>
echo           ^</conditions^>
echo           ^<action type="Rewrite" url="http://localhost:3000/{R:0}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo     ^<defaultDocument^>
echo       ^<files^>
echo         ^<clear /^>
echo         ^<add value="index.html" /^>
echo       ^</files^>
echo     ^</defaultDocument^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo ✅ Web.config created

echo.
echo Step 4: Test DNS Resolution
echo ===========================
echo Testing DNS resolution...
nslookup %DOMAIN_NAME%
if errorlevel 1 (
    echo ⚠️  DNS resolution test failed
    echo This is normal if you're using hosts file only
) else (
    echo ✅ DNS resolution working
)

echo.
echo Step 5: Start Services
echo =====================

REM Start IIS site
echo Starting IIS site...
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site started

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start your Node.js server:
echo    cd %TARGET_DIR%
echo    node server.js
echo.
echo 2. Test access:
echo    - Local: http://localhost:3000
echo    - Domain: http://%DOMAIN_NAME%
echo    - Direct IP: http://%SERVER_IP%
echo.
echo 3. Login with:
echo    Username: admin
echo    Password: admin123
echo.

echo Opening test URLs...
start http://localhost:3000
timeout /t 2
start http://%DOMAIN_NAME%

pause 