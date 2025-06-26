@echo off
echo ========================================
echo   Fix HTTP 404.4 Error for LGU Chat
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set DOMAIN_NAME=lgu-chat.lguquezon.local

echo.
echo The 404.4 error means IIS cannot handle the request.
echo This usually happens when:
echo 1. URL Rewrite module is missing
echo 2. Node.js server is not running
echo 3. Web.config has issues
echo.

echo Step 1: Check Node.js Server Status
echo ===================================
echo Checking if Node.js server is running on port 3000...
netstat -an | findstr :3000
if errorlevel 1 (
    echo ❌ Node.js server is NOT running on port 3000
    echo.
    echo Starting Node.js server...
    cd /d "%TARGET_DIR%"
    start "LGU Chat Server" cmd /k "echo Starting LGU Chat... && node server.js"
    echo ✅ Node.js server starting...
    timeout /t 5
) else (
    echo ✅ Node.js server is running on port 3000
)

echo.
echo Step 2: Test Direct Node.js Access
echo =================================
echo Testing if Node.js responds directly...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5; Write-Host '✅ Node.js is responding'; Write-Host 'Status Code:' $response.StatusCode } catch { Write-Host '❌ Node.js not responding:' $_.Exception.Message }"

echo.
echo Step 3: Check URL Rewrite Module
echo ===============================
echo Checking if URL Rewrite module is installed...
%windir%\system32\inetsrv\appcmd list modules | findstr rewrite
if errorlevel 1 (
    echo ❌ URL Rewrite module is NOT installed
    echo.
    echo Would you like to install it? (Y/N)
    choice /c YN /m "Install URL Rewrite module"
    if errorlevel 2 goto :skip_rewrite
    if errorlevel 1 goto :install_rewrite
) else (
    echo ✅ URL Rewrite module is installed
)
goto :check_config

:install_rewrite
echo.
echo Installing URL Rewrite module...
echo Please download and install from: https://www.iis.net/downloads/microsoft/url-rewrite
echo.
echo Alternative: Use simple proxy without URL Rewrite
choice /c YN /m "Use simple proxy instead"
if errorlevel 1 goto :simple_proxy
goto :skip_rewrite

:simple_proxy
echo.
echo Setting up simple proxy configuration...
cd /d "%TARGET_DIR%"

REM Create simple web.config without URL Rewrite dependency
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<handlers^>
echo       ^<add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified"/^>
echo     ^</handlers^>
echo     ^<httpPlatform processPath="node.exe" arguments="server.js" stdoutLogEnabled="true" stdoutLogFile=".\logs\node.log"^>
echo       ^<environmentVariables^>
echo         ^<environmentVariable name="PORT" value="3000" /^>
echo         ^<environmentVariable name="NODE_ENV" value="production" /^>
echo       ^</environmentVariables^>
echo     ^</httpPlatform^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo ✅ Simple proxy configuration created
goto :restart_site

:check_config
echo.
echo Step 4: Check Web.config
echo ========================
cd /d "%TARGET_DIR%"
if exist web.config (
    echo ✅ Web.config exists
    echo Current web.config content:
    type web.config | more
) else (
    echo ❌ Web.config is missing!
    echo Creating new web.config...
    goto :simple_proxy
)

:restart_site
echo.
echo Step 5: Restart IIS Site
echo =======================
echo Restarting LGU-Chat site...
%windir%\system32\inetsrv\appcmd stop site "LGU-Chat" 2>nul
timeout /t 2
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site restarted

:skip_rewrite
echo.
echo Step 6: Test Access Again
echo ========================
echo Testing access to %DOMAIN_NAME%...
timeout /t 3
echo Opening in browser...
start http://%DOMAIN_NAME%

echo.
echo Step 7: Alternative Access Methods
echo =================================
echo If the domain still doesn't work, try these:
echo.
echo 1. Direct Node.js (should work):
echo    http://localhost:3000
echo.
echo 2. Direct IP (bypass DNS):
echo    http://192.168.32.6
echo.
echo 3. Force host header:
echo    Add to your local hosts file:
echo    192.168.32.6 %DOMAIN_NAME%
echo.

echo Opening alternative URLs...
start http://localhost:3000
timeout /t 2
start http://192.168.32.6

echo.
echo ========================================
echo   Troubleshooting Complete
echo ========================================
echo.
echo If %DOMAIN_NAME% still shows 404.4:
echo 1. Install URL Rewrite module from Microsoft
echo 2. Or use port-based access: http://192.168.32.6:3000
echo 3. Check that Node.js server is running
echo.
pause 