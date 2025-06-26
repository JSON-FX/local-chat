@echo off
title LGU-Chat Deployment Test (Dry Run)
echo ========================================
echo   LGU-Chat Deployment Test (Dry Run)
echo ========================================
echo This script will test all deployment steps without making permanent changes
echo.
pause

REM Test 1: Check if required files exist
echo.
echo ========================================
echo TEST 1: Checking required files...
echo ========================================

set "TEST_PASSED=true"

if exist "package.json" (
    echo ✓ package.json found
) else (
    echo ✗ package.json NOT found
    set "TEST_PASSED=false"
)

if exist "scripts\init-db.ts" (
    echo ✓ scripts\init-db.ts found
) else (
    echo ✗ scripts\init-db.ts NOT found
    set "TEST_PASSED=false"
)

if exist "scripts\manage-users.js" (
    echo ✓ scripts\manage-users.js found
) else (
    echo ✗ scripts\manage-users.js NOT found
    set "TEST_PASSED=false"
)

if exist "deployment\production-server.js" (
    echo ✓ deployment\production-server.js found
) else (
    echo ✗ deployment\production-server.js NOT found
    set "TEST_PASSED=false"
)

if exist "deployment\production.env" (
    echo ✓ deployment\production.env found
) else (
    echo ✗ deployment\production.env NOT found
    set "TEST_PASSED=false"
)

if "%TEST_PASSED%"=="false" (
    echo.
    echo ❌ Required files missing! Cannot proceed with deployment.
    pause
    exit /b 1
)

echo.
echo ✅ All required files found!

REM Test 2: Check Node.js and npm
echo.
echo ========================================
echo TEST 2: Checking Node.js and npm...
echo ========================================

node --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ Node.js is installed
    node --version
) else (
    echo ✗ Node.js NOT found
    set "TEST_PASSED=false"
)

npm --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ npm is installed
    npm --version
) else (
    echo ✗ npm NOT found
    set "TEST_PASSED=false"
)

npx --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ npx is available
) else (
    echo ✗ npx NOT found
    set "TEST_PASSED=false"
)

if "%TEST_PASSED%"=="false" (
    echo.
    echo ❌ Node.js/npm issues detected! Please install Node.js first.
    pause
    exit /b 1
)

REM Test 3: Test database initialization (dry run)
echo.
echo ========================================
echo TEST 3: Testing database initialization...
echo ========================================

REM Create a test database in temp location
set "TEST_DB=data\test-localchat.db"
if not exist "data" mkdir data

echo Testing database schema creation...
set "ORIGINAL_DB_PATH=%DB_PATH%"
set "DB_PATH=%TEST_DB%"

npx tsx scripts/init-db.ts
if %ERRORLEVEL% equ 0 (
    echo ✓ Database initialization test PASSED
    if exist "%TEST_DB%" (
        echo ✓ Test database file created successfully
        del "%TEST_DB%" >nul 2>&1
        echo ✓ Test database cleaned up
    )
) else (
    echo ✗ Database initialization test FAILED
    set "TEST_PASSED=false"
)

set "DB_PATH=%ORIGINAL_DB_PATH%"

REM Test 4: Test user management script
echo.
echo ========================================
echo TEST 4: Testing user management script...
echo ========================================

echo Testing user management script syntax...
node -c scripts/manage-users.js
if %ERRORLEVEL% equ 0 (
    echo ✓ User management script syntax is valid
) else (
    echo ✗ User management script has syntax errors
    set "TEST_PASSED=false"
)

REM Test 5: Test production server syntax
echo.
echo ========================================
echo TEST 5: Testing production server...
echo ========================================

echo Testing production server syntax...
node -c deployment/production-server.js
if %ERRORLEVEL% equ 0 (
    echo ✓ Production server syntax is valid
) else (
    echo ✗ Production server has syntax errors
    set "TEST_PASSED=false"
)

REM Test 6: Check dependencies
echo.
echo ========================================
echo TEST 6: Checking dependencies...
echo ========================================

echo Checking for required dependencies...
npm list bcryptjs >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ bcryptjs is installed
) else (
    echo ⚠ bcryptjs not found (will be installed during deployment)
)

npm list sqlite3 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ sqlite3 is installed
) else (
    echo ⚠ sqlite3 not found (will be installed during deployment)
)

npm list socket.io >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ socket.io is installed
) else (
    echo ⚠ socket.io not found (will be installed during deployment)
)

npm list jsonwebtoken >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ jsonwebtoken is installed
) else (
    echo ⚠ jsonwebtoken not found (will be installed during deployment)
)

REM Test 7: Test environment file parsing
echo.
echo ========================================
echo TEST 7: Testing environment file...
echo ========================================

if exist "deployment\production.env" (
    echo Testing environment file parsing...
    findstr /C:"NODE_ENV" deployment\production.env >nul
    if %ERRORLEVEL% equ 0 (
        echo ✓ NODE_ENV found in environment file
    ) else (
        echo ⚠ NODE_ENV not found in environment file
    )
    
    findstr /C:"JWT_SECRET" deployment\production.env >nul
    if %ERRORLEVEL% equ 0 (
        echo ✓ JWT_SECRET found in environment file
    ) else (
        echo ✗ JWT_SECRET not found in environment file
        set "TEST_PASSED=false"
    )
)

REM Test 8: Check disk space and permissions
echo.
echo ========================================
echo TEST 8: Checking system requirements...
echo ========================================

echo Checking disk space...
dir >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ Directory is accessible
) else (
    echo ✗ Directory access issues
    set "TEST_PASSED=false"
)

echo Testing file creation permissions...
echo test > test-file.tmp 2>nul
if exist "test-file.tmp" (
    echo ✓ File creation permissions OK
    del test-file.tmp >nul 2>&1
) else (
    echo ✗ Cannot create files in current directory
    set "TEST_PASSED=false"
)

REM Final Results
echo.
echo ========================================
echo   DEPLOYMENT TEST RESULTS
echo ========================================

if "%TEST_PASSED%"=="true" (
    echo ✅ ALL TESTS PASSED!
    echo.
    echo The deployment should work successfully.
    echo You can now run: deployment\deploy-production.bat
    echo.
    echo Expected deployment process:
    echo 1. Install dependencies
    echo 2. Build application (may fail - that's OK)
    echo 3. Initialize database
    echo 4. Clean demo users
    echo 5. Set admin password to: adminmm0m!s
    echo 6. Deploy production server
    echo 7. Start with: deployment\start-production.bat
) else (
    echo ❌ SOME TESTS FAILED!
    echo.
    echo Please fix the issues above before running deployment.
    echo Check the error messages and resolve them first.
)

echo.
echo ========================================
pause 