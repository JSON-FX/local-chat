@echo off
echo ========================================
echo   Fix Module Not Found Error
echo ========================================

set SOURCE_DIR=%~dp0..
set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat

echo.
echo The error shows Node.js can't find './lib/socket' module
echo This means either:
echo 1. Files weren't copied properly to deployment directory
echo 2. Running wrong server file
echo 3. Missing dependencies in deployment location
echo.

echo Source directory: %SOURCE_DIR%
echo Target directory: %TARGET_DIR%
echo.

echo Step 1: Check Current Location and Files
echo ========================================
echo Current directory:
cd
echo.
echo Files in current directory:
dir
echo.
echo Checking if lib directory exists:
if exist lib (
    echo ✅ lib directory found
    echo Contents of lib directory:
    dir lib
) else (
    echo ❌ lib directory NOT found
)

echo.
echo Step 2: Stop Current Node.js Process
echo ===================================
echo Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 2

echo.
echo Step 3: Check Source Directory
echo ==============================
echo Checking source directory: %SOURCE_DIR%
cd /d "%SOURCE_DIR%"
echo Current directory: %CD%
echo.
echo Files in source:
dir
echo.
echo Checking if lib exists in source:
if exist lib (
    echo ✅ lib directory found in source
    echo Contents:
    dir lib
) else (
    echo ❌ lib directory NOT found in source
)

echo.
echo Step 4: Copy All Files to Deployment Directory
echo ==============================================
echo Ensuring target directory exists...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo Copying all project files to deployment location...
xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /Y /I /Q
if errorlevel 1 (
    echo ❌ File copy failed
) else (
    echo ✅ Files copied successfully
)

echo.
echo Step 5: Verify Files in Target Directory
echo ========================================
cd /d "%TARGET_DIR%"
echo Current directory: %CD%
echo.
echo Key files check:
if exist server.js echo ✅ server.js
if exist server-fixed.js echo ✅ server-fixed.js  
if exist package.json echo ✅ package.json
if exist lib echo ✅ lib directory
if exist node_modules echo ✅ node_modules

echo.
echo Contents of lib directory:
if exist lib dir lib

echo.
echo Step 6: Install Dependencies in Target Location
echo ==============================================
echo Installing Node.js dependencies in deployment location...
if exist package.json (
    call npm install
    echo ✅ Dependencies installed
) else (
    echo ❌ No package.json found
)

echo.
echo Step 7: Choose Correct Server File
echo =================================
echo Available server files:
if exist server.js echo - server.js (TypeScript version - may have issues)
if exist server-fixed.js echo - server-fixed.js (Fixed JavaScript version)
if exist server.ts echo - server.ts (TypeScript source)

echo.
echo Recommendation: Use server-fixed.js for deployment
echo.

echo Step 8: Start Server with Network Access
echo =========================================
echo Starting server with proper environment...

set NODE_ENV=production
set HOST=0.0.0.0
set PORT=3000

if exist server-fixed.js (
    echo Using server-fixed.js...
    start "LGU Chat Server" cmd /k "echo LGU Chat Server Starting... && echo Network Access: http://192.168.32.6:3000 && echo Local Access: http://localhost:3000 && echo. && node server-fixed.js"
) else if exist server.js (
    echo Using server.js...
    start "LGU Chat Server" cmd /k "echo LGU Chat Server Starting... && echo Network Access: http://192.168.32.6:3000 && echo Local Access: http://localhost:3000 && echo. && node server.js"
) else (
    echo ❌ No server file found!
    echo Available files:
    dir *.js
)

timeout /t 5

echo.
echo Step 9: Test Server Access
echo ==========================
echo Testing if server is responding...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10; Write-Host '✅ Server responding (Status:' $response.StatusCode ')' } catch { Write-Host '❌ Server not responding:' $_.Exception.Message }"

echo.
echo ========================================
echo   Summary
echo ========================================
echo.
echo ✅ NETWORK ACCESS URL: http://192.168.32.6:3000
echo ✅ LOCAL ACCESS URL: http://localhost:3000
echo.
echo 📋 Login Credentials:
echo Username: admin
echo Password: admin123
echo.
echo Share this URL with network users:
echo http://192.168.32.6:3000
echo.

echo Opening network access URL...
start http://192.168.32.6:3000

echo.
echo If you still get module errors:
echo 1. Check the Node.js server window for specific error details
echo 2. Ensure all dependencies are installed: npm install
echo 3. Use server-fixed.js instead of server.js
echo.
pause 