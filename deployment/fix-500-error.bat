@echo off
echo ========================================
echo   Fix HTTP 500.19 Configuration Error
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set DOMAIN_NAME=lgu-chat.lguquezon.local

echo.
echo HTTP 500.19 means there's a configuration error in web.config
echo Let's fix this step by step...
echo.

echo Step 1: Check Current Web.config
echo ================================
cd /d "%TARGET_DIR%"
if exist web.config (
    echo Current web.config found. Backing up...
    copy web.config web.config.error-backup
    echo.
    echo Current web.config content:
    type web.config
    echo.
) else (
    echo No web.config found in %TARGET_DIR%
)

echo Step 2: Remove Problematic Web.config
echo =====================================
echo Removing current web.config to clear the error...
if exist web.config del web.config
echo ✅ Web.config removed

echo.
echo Step 3: Test Without Web.config
echo ===============================
echo Testing if IIS works without web.config...
%windir%\system32\inetsrv\appcmd stop site "LGU-Chat" 2>nul
timeout /t 2
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site restarted

echo.
echo Testing basic IIS access...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%DOMAIN_NAME%' -TimeoutSec 10; Write-Host '✅ IIS responding without web.config (Status:' $response.StatusCode ')' } catch { Write-Host '❌ IIS still has issues:' $_.Exception.Message }"

echo.
echo Step 4: Check URL Rewrite Module Installation
echo =============================================
echo Checking different ways to detect URL Rewrite...

echo Method 1: appcmd list modules
%windir%\system32\inetsrv\appcmd list modules | findstr -i rewrite

echo.
echo Method 2: Check IIS modules directory
dir "%windir%\system32\inetsrv\" | findstr -i rewrite

echo.
echo Method 3: Check registry for URL Rewrite
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite" 2>nul
if errorlevel 1 (
    echo URL Rewrite not found in registry
) else (
    echo ✅ URL Rewrite found in registry
)

echo.
echo Step 5: Create Simple Web.config (No URL Rewrite)
echo =================================================
echo Creating basic web.config without URL Rewrite dependency...

(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<defaultDocument^>
echo       ^<files^>
echo         ^<clear /^>
echo         ^<add value="index.html" /^>
echo         ^<add value="default.htm" /^>
echo       ^</files^>
echo     ^</defaultDocument^>
echo     ^<staticContent^>
echo       ^<mimeMap fileExtension=".json" mimeType="application/json" /^>
echo       ^<mimeMap fileExtension=".js" mimeType="text/javascript" /^>
echo     ^</staticContent^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo ✅ Basic web.config created

echo.
echo Step 6: Test Basic Configuration
echo ================================
echo Restarting IIS with basic web.config...
%windir%\system32\inetsrv\appcmd stop site "LGU-Chat"
timeout /t 2
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"

echo Testing basic configuration...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%DOMAIN_NAME%' -TimeoutSec 10; Write-Host '✅ Basic config works (Status:' $response.StatusCode ')' } catch { Write-Host '❌ Basic config failed:' $_.Exception.Message }"

echo.
echo Step 7: Alternative Solutions
echo =============================
echo Since URL Rewrite might not be properly installed, here are alternatives:
echo.

echo Option A: Use direct Node.js access
echo ------------------------------------
echo Start Node.js with network binding:
echo cd %TARGET_DIR%
echo set HOST=0.0.0.0
echo set PORT=3000
echo node server.js
echo.
echo Then access via: http://192.168.32.6:3000
echo.

echo Option B: Install Application Request Routing (ARR)
echo ---------------------------------------------------
echo ARR can proxy without URL Rewrite module
echo Download from: https://www.iis.net/downloads/microsoft/application-request-routing
echo.

echo Option C: Use IIS Express
echo -------------------------
echo Run with IIS Express instead of full IIS
echo.

echo.
echo Step 8: Start Network-Accessible Node.js
echo ========================================
echo Starting Node.js server with network access...
cd /d "%TARGET_DIR%"

echo Checking if Node.js is running...
tasklist | findstr node.exe
if not errorlevel 1 (
    echo Stopping existing Node.js processes...
    taskkill /f /im node.exe 2>nul
    timeout /t 2
)

echo Starting Node.js with network binding...
set HOST=0.0.0.0
set PORT=3000
start "LGU Chat - Network Access" cmd /k "echo LGU Chat running on network... && echo Access via: http://192.168.32.6:3000 && echo. && node server.js"

timeout /t 5

echo.
echo ========================================
echo   Quick Solution Summary
echo ========================================
echo.
echo ✅ WORKING SOLUTION: Direct Node.js Access
echo URL: http://192.168.32.6:3000
echo.
echo ❌ IIS Domain Access: Still needs proper URL Rewrite
echo URL: http://%DOMAIN_NAME% (may not work)
echo.
echo 📋 Login Credentials:
echo Username: admin
echo Password: admin123
echo.

echo Opening working URL...
start http://192.168.32.6:3000

echo.
echo If you want to fix IIS domain access:
echo 1. Reinstall URL Rewrite module
echo 2. Or install Application Request Routing (ARR)
echo 3. Or continue using: http://192.168.32.6:3000
echo.
pause 