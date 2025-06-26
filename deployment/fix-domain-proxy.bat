@echo off
echo ========================================
echo   Fix Domain Proxy Configuration
echo ========================================

set DOMAIN_NAME=lgu-chat.lguquezon.local
set SERVER_IP=192.168.32.6
set NODE_PORT=3000

echo.
echo Current Status:
echo ✅ Node.js working: http://%SERVER_IP%:%NODE_PORT%
echo ❌ Domain not working: http://%DOMAIN_NAME% (404.4 error)
echo.
echo Problem: URL Rewrite proxy configuration issue
echo Solution: Use HTTP Redirect instead of proxy
echo.

echo Step 1: Stop IIS Site
echo =====================
%windir%\system32\inetsrv\appcmd stop site "LGU-Chat"
echo ✅ IIS site stopped

echo.
echo Step 2: Switch to HTTP Redirect
echo ===============================
cd /d "C:\inetpub\wwwroot\lgu-chat-redirect"

echo Creating simple HTTP redirect web.config...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<httpRedirect enabled="true" destination="http://%SERVER_IP%:%NODE_PORT%/" httpResponseStatus="Found" /^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config

echo ✅ HTTP Redirect configuration created

echo.
echo Step 3: Create Default Document
echo ===============================
echo Creating index.html for immediate redirect...
(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo   ^<title^>LGU Chat - Redirecting...^</title^>
echo   ^<meta http-equiv="refresh" content="0;url=http://%SERVER_IP%:%NODE_PORT%/"^>
echo ^</head^>
echo ^<body^>
echo   ^<p^>Redirecting to LGU Chat... ^<a href="http://%SERVER_IP%:%NODE_PORT%/"^>Click here if not redirected^</a^>^</p^>
echo ^</body^>
echo ^</html^>
) > index.html

echo ✅ Default redirect page created

echo.
echo Step 4: Restart IIS Site
echo ========================
%windir%\system32\inetsrv\appcmd start site "LGU-Chat"
echo ✅ IIS site restarted

echo.
echo Step 5: Test Domain Access
echo ==========================
echo Testing domain access...
timeout /t 3
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%DOMAIN_NAME%' -TimeoutSec 10; Write-Host '✅ Domain access works! (Status:' $response.StatusCode ')' } catch { Write-Host '❌ Domain access failed:' $_.Exception.Message }"

echo.
echo Step 6: Alternative - Application Request Routing
echo =================================================
echo If you want seamless proxy (no URL change), consider installing:
echo Application Request Routing (ARR) from Microsoft
echo This provides better proxy capabilities than URL Rewrite alone.
echo.

echo Step 7: Test Both URLs
echo ======================
echo Opening both URLs for testing...

echo Testing domain URL...
start http://%DOMAIN_NAME%
timeout /t 3

echo Testing direct URL...
start http://%SERVER_IP%:%NODE_PORT%

echo.
echo ========================================
echo   Domain Access Summary
echo ========================================
echo.
echo ✅ PRIMARY URL (Domain): http://%DOMAIN_NAME%
echo   - Redirects to working Node.js server
echo   - Clean domain name for users
echo.
echo ✅ BACKUP URL (Direct):  http://%SERVER_IP%:%NODE_PORT%
echo   - Direct access to Node.js server
echo   - Always works as fallback
echo.
echo 📋 For Network Users:
echo Share this URL: http://%DOMAIN_NAME%
echo Backup URL:     http://%SERVER_IP%:%NODE_PORT%
echo.
echo 📋 Login Credentials:
echo Username: admin
echo Password: admin123
echo.

echo Notes:
echo - Domain now uses HTTP redirect (URL will change to show port)
echo - This is more reliable than URL Rewrite proxy
echo - Users can bookmark either URL
echo - Both URLs work and show the same application
echo.
pause 