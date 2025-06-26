@echo off
echo ========================================
echo   Fix URL Rewrite Configuration
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set DOMAIN_NAME=lgu-chat.lguquezon.local

echo.
echo Now that URL Rewrite module is installed, let's configure it properly.
echo.

echo Step 1: Verify URL Rewrite Module
echo =================================
echo Checking if URL Rewrite module is installed...
%windir%\system32\inetsrv\appcmd list modules | findstr rewrite
if errorlevel 1 (
    echo ❌ URL Rewrite module still not detected
    echo Please ensure it's installed from: https://www.iis.net/downloads/microsoft/url-rewrite
    pause
    exit /b 1
) else (
    echo ✅ URL Rewrite module is installed
)

echo.
echo Step 2: Check Node.js Server
echo ============================
echo Ensuring Node.js server is running...
tasklist | findstr node.exe
if errorlevel 1 (
    echo Starting Node.js server...
    cd /d "%TARGET_DIR%"
    start "LGU Chat Server" cmd /k "echo Starting LGU Chat Server... && node server.js"
    timeout /t 5
    echo ✅ Node.js server started
) else (
    echo ✅ Node.js server is already running
)

echo.
echo Step 3: Create Proper URL Rewrite Configuration
echo ==============================================
cd /d "%TARGET_DIR%"

REM Backup current web.config
if exist web.config (
    copy web.config web.config.backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%
    echo Backed up current web.config
)

echo Creating URL Rewrite web.config...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="LGU Chat Node.js" stopProcessing="true"^>
echo           ^<match url=".*" /^>
echo           ^<conditions^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /^>
echo             ^<add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /^>
echo           ^</conditions^>
echo           ^<action type="Rewrite" url="http://localhost:3000/{R:0}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo     ^<defaultDocument^>
echo       ^<files^>
echo         ^<clear /^>
echo         ^<add value="default.htm" /^>
echo         ^<add value="index.html" /^>
echo       ^</files^>
echo     ^</defaultDocument^>
echo     ^<staticContent^>
echo       ^<mimeMap fileExtension=".json" mimeType="application/json" /^>
echo       ^<mimeMap fileExtension=".js" mimeType="text/javascript" /^>
echo     ^</staticContent^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo ✅ URL Rewrite web.config created

echo.
echo Step 4: Test Web.config Syntax
echo ==============================
echo Testing web.config syntax...
%windir%\system32\inetsrv\appcmd list config "%TARGET_DIR%" -section:system.webServer/rewrite/rules
if errorlevel 1 (
    echo ❌ Web.config has syntax errors
    echo Restoring backup...
    if exist web.config.backup* copy web.config.backup* web.config
) else (
    echo ✅ Web.config syntax is valid
)

echo.
echo Step 5: Restart IIS Site
echo =======================
echo Restarting LGU-Chat site to apply new configuration...
%windir%\system32\inetsrv\appcmd stop site "LGU-Chat"
timeout /t 2
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site restarted

echo.
echo Step 6: Test Direct Node.js Access
echo =================================
echo Testing Node.js direct access first...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10; Write-Host '✅ Node.js direct access works (Status:' $response.StatusCode ')' } catch { Write-Host '❌ Node.js not responding:' $_.Exception.Message; Write-Host 'Make sure Node.js server is running!' }"

echo.
echo Step 7: Test Domain Access via URL Rewrite
echo ==========================================
echo Testing domain access through IIS URL Rewrite...
timeout /t 3
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%DOMAIN_NAME%' -TimeoutSec 15; Write-Host '✅ Domain access works! (Status:' $response.StatusCode ')' } catch { Write-Host '❌ Domain access failed:' $_.Exception.Message }"

echo.
echo Step 8: Test IP Access
echo ======================
echo Testing IP access...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.32.6' -TimeoutSec 10; Write-Host '✅ IP access works! (Status:' $response.StatusCode ')' } catch { Write-Host '❌ IP access failed:' $_.Exception.Message }"

echo.
echo ========================================
echo   Testing Complete
echo ========================================
echo.
echo Opening browser tests...
echo 1. Direct Node.js: http://localhost:3000
start http://localhost:3000
timeout /t 2

echo 2. Domain via URL Rewrite: http://%DOMAIN_NAME%
start http://%DOMAIN_NAME%
timeout /t 2

echo 3. IP via URL Rewrite: http://192.168.32.6
start http://192.168.32.6

echo.
echo If domain still doesn't work, check:
echo 1. IIS Error logs: C:\inetpub\logs\LogFiles\
echo 2. Node.js console for any errors
echo 3. Windows Event Viewer for IIS errors
echo.
echo Login credentials:
echo Username: admin
echo Password: admin123
echo.
pause 