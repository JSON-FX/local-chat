@echo off
echo ========================================
echo   Comprehensive Web Access Diagnosis
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat

echo.
echo Step 1: Check Node.js Server Status
echo ====================================
echo Checking if Node.js is still running...
tasklist | findstr node.exe
if errorlevel 1 (
    echo WARNING: Node.js server might not be running
    echo Starting Node.js server...
    cd /d "%TARGET_DIR%"
    start "Node.js Server" cmd /k "node server.js"
    timeout /t 5
) else (
    echo Node.js server is running
)

echo.
echo Step 2: Test Node.js Direct Access
echo ==================================
echo Testing direct Node.js access on port 3000...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10; Write-Host 'SUCCESS: Node.js responding'; Write-Host 'Status:' $response.StatusCode } catch { Write-Host 'FAILED: Node.js not responding -' $_.Exception.Message }"

echo.
echo Step 3: Check IIS Configuration
echo ===============================
echo Checking IIS site details...
%windir%\system32\inetsrv\appcmd list site "lgu-chat" /config

echo.
echo Step 4: Check Web.config
echo ========================
cd /d "%TARGET_DIR%"
if exist web.config (
    echo web.config exists
    echo First few lines:
    powershell -Command "Get-Content web.config | Select-Object -First 10"
) else (
    echo ERROR: web.config is missing!
)

echo.
echo Step 5: Test IIS Response
echo ========================
echo Testing IIS direct response...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost' -TimeoutSec 10; Write-Host 'SUCCESS: IIS responding'; Write-Host 'Status:' $response.StatusCode } catch { Write-Host 'FAILED: IIS not responding -' $_.Exception.Message }"

echo.
echo Step 6: Check Port Bindings
echo ===========================
echo Checking what's listening on port 80...
netstat -an | findstr :80

echo Checking what's listening on port 3000...
netstat -an | findstr :3000

echo.
echo Step 7: Test Host Header Resolution
echo ===================================
echo Testing with host header...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.32.6' -Headers @{'Host'='lgu-chat.lguquezon.local'} -TimeoutSec 10; Write-Host 'SUCCESS: Host header works'; Write-Host 'Status:' $response.StatusCode } catch { Write-Host 'FAILED: Host header issue -' $_.Exception.Message }"

echo.
echo Step 8: Check IIS Modules
echo =========================
echo Checking for URL Rewrite module...
%windir%\system32\inetsrv\appcmd list modules | findstr rewrite

echo Checking for Application Request Routing...
%windir%\system32\inetsrv\appcmd list modules | findstr arr

echo.
echo Step 9: Browser Test Recommendations
echo ====================================
echo Now try these URLs in your browser:
echo.
echo 1. http://localhost (should work if IIS is running)
echo 2. http://192.168.32.6 (direct IP)
echo 3. http://localhost:3000 (direct Node.js)
echo 4. http://192.168.32.6:3000 (Node.js with IP)
echo.
echo Press any key to open these in browser...
pause

echo Opening test URLs...
start http://localhost
timeout /t 2
start http://192.168.32.6
timeout /t 2
start http://localhost:3000
timeout /t 2
start http://192.168.32.6:3000

echo.
echo ========================================
echo   Diagnosis Complete
echo ========================================
echo.
echo Please check which URLs worked in your browser and report back.
echo If none work, we may need to:
echo 1. Install URL Rewrite module
echo 2. Fix IIS configuration
echo 3. Check Windows Firewall
echo.
pause 