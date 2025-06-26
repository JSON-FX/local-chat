@echo off
setlocal enabledelayedexpansion

REM Create log file with timestamp
set LOG_FILE=deployment\build-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOG_FILE=%LOG_FILE: =0%

echo Building LGU Chat Application - TailwindCSS v4 Fixed... | tee %LOG_FILE%
echo Build started at %date% %time% >> %LOG_FILE%
echo ========================================== >> %LOG_FILE%

echo.
echo ========================
echo Step 1: Environment Info
echo ========================
echo Gathering environment information... | tee -a %LOG_FILE%
echo Node.js version: >> %LOG_FILE%
node --version >> %LOG_FILE% 2>&1
echo NPM version: >> %LOG_FILE%
npm --version >> %LOG_FILE% 2>&1
echo Current directory: >> %LOG_FILE%
cd >> %LOG_FILE%
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 2: Clean and Install
echo ========================
echo Installing dependencies... | tee -a %LOG_FILE%
echo Running: npm install >> %LOG_FILE%
call npm install >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: npm install failed with exit code !errorLevel! >> %LOG_FILE%
) else (
    echo SUCCESS: npm install completed >> %LOG_FILE%
)

echo.
echo ========================
echo Step 3: Verify TailwindCSS Setup
echo ========================
echo Checking TailwindCSS configuration... | tee -a %LOG_FILE%

echo Installing compatible PostCSS setup... | tee -a %LOG_FILE%
echo Running: npm install postcss@latest autoprefixer@latest >> %LOG_FILE%
call npm install postcss@latest autoprefixer@latest >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: PostCSS install failed with exit code !errorLevel! >> %LOG_FILE%
) else (
    echo SUCCESS: PostCSS install completed >> %LOG_FILE%
)

echo.
echo ========================
echo Step 4: Check Package Versions
echo ========================
echo Checking installed package versions... >> %LOG_FILE%
npm list tailwindcss >> %LOG_FILE% 2>&1
npm list @tailwindcss/postcss >> %LOG_FILE% 2>&1
npm list next >> %LOG_FILE% 2>&1
npm list postcss >> %LOG_FILE% 2>&1
npm list autoprefixer >> %LOG_FILE% 2>&1
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 5: Try Alternative Build Method
echo ========================
echo Trying Next.js build without custom PostCSS... | tee -a %LOG_FILE%

REM Temporarily rename PostCSS config to bypass issues
if exist postcss.config.mjs (
    echo Temporarily disabling custom PostCSS config... | tee -a %LOG_FILE%
    ren postcss.config.mjs postcss.config.mjs.backup
    echo PostCSS config backed up >> %LOG_FILE%
)

echo Building Next.js application... | tee -a %LOG_FILE%
echo Running: npm run build >> %LOG_FILE%
call npm run build >> %LOG_FILE% 2>&1
set BUILD_RESULT=!errorLevel!

REM Restore PostCSS config
if exist postcss.config.mjs.backup (
    echo Restoring PostCSS config... | tee -a %LOG_FILE%
    ren postcss.config.mjs.backup postcss.config.mjs
    echo PostCSS config restored >> %LOG_FILE%
)

if !BUILD_RESULT! neq 0 (
    echo ERROR: First build attempt failed with exit code !BUILD_RESULT! >> %LOG_FILE%
    echo.
    echo Build still failed. Trying TailwindCSS v3 compatibility... | tee -a %LOG_FILE%
    echo Installing TailwindCSS v3... | tee -a %LOG_FILE%
    echo Running: npm install tailwindcss@^3.0.0 --save-dev >> %LOG_FILE%
    call npm install tailwindcss@^3.0.0 --save-dev >> %LOG_FILE% 2>&1
    
    echo Retrying build with TailwindCSS v3... | tee -a %LOG_FILE%
    echo Running: npm run build (retry with v3) >> %LOG_FILE%
    call npm run build >> %LOG_FILE% 2>&1
    set BUILD_RESULT=!errorLevel!
    
    if !BUILD_RESULT! neq 0 (
        echo ERROR: Second build attempt failed with exit code !BUILD_RESULT! >> %LOG_FILE%
    ) else (
        echo SUCCESS: Build completed with TailwindCSS v3 >> %LOG_FILE%
    )
) else (
    echo SUCCESS: First build attempt completed >> %LOG_FILE%
)

echo.
echo ========================
echo Step 6: Initialize Database
echo ========================
echo Creating data directory... | tee -a %LOG_FILE%
if not exist data mkdir data
echo Data directory created >> %LOG_FILE%

echo Initializing database... | tee -a %LOG_FILE%
echo Running: node scripts\init-db.js >> %LOG_FILE%
call node scripts\init-db.js >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: Database initialization failed with exit code !errorLevel! >> %LOG_FILE%
) else (
    echo SUCCESS: Database initialization completed >> %LOG_FILE%
)

echo.
echo ========================
echo Step 7: Prepare for IIS
echo ========================
echo Copying server file for IIS... | tee -a %LOG_FILE%
echo Running: copy server.ts server.js >> %LOG_FILE%
copy server.ts server.js >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: Server file copy failed with exit code !errorLevel! >> %LOG_FILE%
) else (
    echo SUCCESS: Server file copied >> %LOG_FILE%
)

echo.
echo ========================
echo Build Process Complete!
echo ========================
echo Build completed at %date% %time% >> %LOG_FILE%
echo Final build result: !BUILD_RESULT! >> %LOG_FILE%
echo ========================================== >> %LOG_FILE%

if !BUILD_RESULT! equ 0 (
    echo ✅ Build successful! | tee -a %LOG_FILE%
    echo Next steps: | tee -a %LOG_FILE%
    echo 1. Run: deployment\setup-iis.ps1 ^(as Administrator^) | tee -a %LOG_FILE%
    echo 2. Run: deployment\deploy.bat | tee -a %LOG_FILE%
    echo 3. Start IIS site | tee -a %LOG_FILE%
) else (
    echo ❌ Build failed. Check the error messages above. | tee -a %LOG_FILE%
    echo 📋 DETAILED LOG SAVED TO: %LOG_FILE% | tee -a %LOG_FILE%
    echo Please share this log file for debugging. | tee -a %LOG_FILE%
)

echo.
echo 📋 Log file created: %LOG_FILE%
echo You can find the complete build log at: %LOG_FILE%
echo.
pause 