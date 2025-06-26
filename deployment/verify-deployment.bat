@echo off
echo ========================================
echo   Verify LGU Chat Deployment Status
echo ========================================

set DOMAIN_NAME=lgu-chat.lguquezon.local
set SERVER_IP=192.168.32.6

echo.
echo Testing all access methods...
echo.

echo 1. Checking Node.js Server Status
echo =================================
tasklist | findstr node.exe
if errorlevel 1 (
    echo ❌ Node.js process not found
) else (
    echo ✅ Node.js is running
)

echo.
echo 2. Checking Port 3000
echo =====================
netstat -an | findstr :3000
if errorlevel 1 (
    echo ❌ Port 3000 not listening
) else (
    echo ✅ Port 3000 is listening
)

echo.
echo 3. Testing Direct Node.js Access
echo ================================
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10; Write-Host '✅ localhost:3000 - SUCCESS (Status:' $response.StatusCode ')' } catch { Write-Host '❌ localhost:3000 - FAILED:' $_.Exception.Message }"

echo.
echo 4. Testing Domain Access
echo ========================
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%DOMAIN_NAME%' -TimeoutSec 10; Write-Host '✅ %DOMAIN_NAME% - SUCCESS (Status:' $response.StatusCode ')' } catch { Write-Host '❌ %DOMAIN_NAME% - FAILED:' $_.Exception.Message }"

echo.
echo 5. Testing IP Access
echo ====================
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%SERVER_IP%' -TimeoutSec 10; Write-Host '✅ %SERVER_IP% - SUCCESS (Status:' $response.StatusCode ')' } catch { Write-Host '❌ %SERVER_IP% - FAILED:' $_.Exception.Message }"

echo.
echo 6. Opening Working URLs
echo =======================
echo Opening all test URLs in browser...

REM Test localhost:3000 first (most likely to work)
echo Testing localhost:3000...
start http://localhost:3000
timeout /t 3

REM Test domain
echo Testing %DOMAIN_NAME%...
start http://%DOMAIN_NAME%
timeout /t 3

REM Test IP
echo Testing %SERVER_IP%...
start http://%SERVER_IP%

echo.
echo ========================================
echo   Results Summary
echo ========================================
echo.
echo URLs to try:
echo 1. http://localhost:3000 (direct Node.js)
echo 2. http://%DOMAIN_NAME% (domain via IIS)
echo 3. http://%SERVER_IP% (IP via IIS)
echo.
echo Login credentials:
echo Username: admin
echo Password: admin123
echo.
echo If only localhost:3000 works, use this command for network access:
echo cd C:\inetpub\wwwroot\Github\local-chat
echo set HOST=0.0.0.0 && node server.js
echo.
pause 