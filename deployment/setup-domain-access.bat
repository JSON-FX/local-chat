@echo off
echo ========================================
echo   Setup Domain Access: lgu-chat.lguquezon.local
echo ========================================

set DOMAIN_NAME=lgu-chat.lguquezon.local
set SERVER_IP=192.168.32.6
set NODE_PORT=3000

echo.
echo Current Status:
echo ✅ Node.js server working: http://%SERVER_IP%:%NODE_PORT%
echo 🎯 Goal: Access via http://%DOMAIN_NAME%
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

echo Step 1: Configure DNS for Domain
echo =================================
echo Adding DNS record for %DOMAIN_NAME%...

REM Add to hosts file for immediate local access
findstr /C:"%SERVER_IP% %DOMAIN_NAME%" C:\Windows\System32\drivers\etc\hosts >nul
if errorlevel 1 (
    echo %SERVER_IP% %DOMAIN_NAME% >> C:\Windows\System32\drivers\etc\hosts
    echo ✅ Added to hosts file: %SERVER_IP% %DOMAIN_NAME%
) else (
    echo ✅ Already in hosts file: %SERVER_IP% %DOMAIN_NAME%
)

REM Try to add DNS server record
dnscmd /recordadd lguquezon.local lgu-chat A %SERVER_IP% 2>nul
if errorlevel 1 (
    echo ⚠️  DNS server record not added (may need manual DNS configuration)
) else (
    echo ✅ DNS server record added
)

echo.
echo Step 2: Setup IIS Site for Domain
echo =================================

REM Remove existing site if it exists
echo Removing any existing LGU-Chat site...
%windir%\system32\inetsrv\appcmd delete site "LGU-Chat" 2>nul

REM Create new site with domain binding (but no files - will redirect to Node.js)
echo Creating IIS site for domain...
mkdir C:\inetpub\wwwroot\lgu-chat-redirect 2>nul
%windir%\system32\inetsrv\appcmd add site /name:"LGU-Chat" /physicalPath:"C:\inetpub\wwwroot\lgu-chat-redirect" /bindings:http/*:80:%DOMAIN_NAME%

REM Configure application pool
%windir%\system32\inetsrv\appcmd add apppool /name:"LGU-Chat" 2>nul
%windir%\system32\inetsrv\appcmd set apppool "LGU-Chat" /managedRuntimeVersion:""
%windir%\system32\inetsrv\appcmd set site "LGU-Chat" /[path='/'].applicationPool:"LGU-Chat"

echo ✅ IIS site configured for domain

echo.
echo Step 3: Create Redirect Configuration
echo =====================================
cd /d "C:\inetpub\wwwroot\lgu-chat-redirect"

echo Creating redirect web.config...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<httpRedirect enabled="true" destination="http://%SERVER_IP%:%NODE_PORT%" httpResponseStatus="Permanent" /^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo ✅ Redirect configuration created

echo.
echo Step 4: Alternative - URL Rewrite Proxy (if you have the module)
echo ================================================================
echo Creating URL Rewrite proxy web.config as backup...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="Proxy to Node.js" stopProcessing="true"^>
echo           ^<match url=".*" /^>
echo           ^<action type="Rewrite" url="http://localhost:%NODE_PORT%/{R:0}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config.proxy

echo ✅ Proxy configuration created as backup

echo.
echo Step 5: Start IIS Site
echo ======================
echo Starting IIS site...
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site started

echo.
echo Step 6: Test DNS Resolution
echo ===========================
echo Testing DNS resolution...
nslookup %DOMAIN_NAME%
echo.

echo Step 7: Test Domain Access
echo ==========================
echo Testing domain access...
timeout /t 3
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%DOMAIN_NAME%' -TimeoutSec 15 -MaximumRedirection 0; Write-Host '✅ Domain access works! (Status:' $response.StatusCode ')' } catch { Write-Host '❌ Domain access failed:' $_.Exception.Message }"

echo.
echo Step 8: Alternative Setup for URL Rewrite
echo =========================================
echo If you want to use URL Rewrite instead of redirect:
echo.
choice /c YN /m "Switch to URL Rewrite proxy instead of redirect"
if errorlevel 2 goto :skip_proxy
if errorlevel 1 goto :setup_proxy

:setup_proxy
echo Switching to URL Rewrite proxy...
copy web.config.proxy web.config
echo ✅ URL Rewrite proxy enabled
%windir%\system32\inetsrv\appcmd stop site "LGU-Chat"
timeout /t 2
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site restarted with proxy

:skip_proxy
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo ✅ DOMAIN ACCESS: http://%DOMAIN_NAME%
echo ✅ DIRECT ACCESS: http://%SERVER_IP%:%NODE_PORT%
echo.
echo 📋 For Network Users:
echo Primary URL: http://%DOMAIN_NAME%
echo Backup URL:  http://%SERVER_IP%:%NODE_PORT%
echo.
echo 📋 Login Credentials:
echo Username: admin
echo Password: admin123
echo.

echo Opening domain URL...
start http://%DOMAIN_NAME%
timeout /t 3
echo Opening direct URL as backup...
start http://%SERVER_IP%:%NODE_PORT%

echo.
echo Notes:
echo - Domain redirects to the working Node.js server
echo - If redirect doesn't work, try the proxy option
echo - Direct access always available as backup
echo - Ensure Node.js server stays running
echo.
pause 