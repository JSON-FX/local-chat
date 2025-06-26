@echo off
setlocal enabledelayedexpansion

REM Create log file with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "LOG_FILE=deployment\build-log-%YYYY%%MM%%DD%-%HH%%Min%%Sec%.txt"

echo Building LGU Chat Application - With Detailed Logging...
echo Build started at %date% %time% > %LOG_FILE%
echo ========================================== >> %LOG_FILE%
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 1: Environment Info
echo ========================
echo Gathering environment information...
echo Step 1: Environment Info >> %LOG_FILE%
echo ======================== >> %LOG_FILE%
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
echo Installing dependencies...
echo Step 2: Clean and Install >> %LOG_FILE%
echo ========================= >> %LOG_FILE%
echo Running: npm install >> %LOG_FILE%
call npm install >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: npm install failed with exit code !errorLevel! >> %LOG_FILE%
    echo ERROR: npm install failed!
) else (
    echo SUCCESS: npm install completed >> %LOG_FILE%
    echo SUCCESS: npm install completed
)
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 3: Package Versions
echo ========================
echo Checking installed package versions...
echo Step 3: Package Versions >> %LOG_FILE%
echo ========================= >> %LOG_FILE%
echo Checking TailwindCSS version: >> %LOG_FILE%
npm list tailwindcss >> %LOG_FILE% 2>&1
echo Checking @tailwindcss/postcss version: >> %LOG_FILE%
npm list @tailwindcss/postcss >> %LOG_FILE% 2>&1
echo Checking Next.js version: >> %LOG_FILE%
npm list next >> %LOG_FILE% 2>&1
echo Checking PostCSS version: >> %LOG_FILE%
npm list postcss >> %LOG_FILE% 2>&1
echo Checking Autoprefixer version: >> %LOG_FILE%
npm list autoprefixer >> %LOG_FILE% 2>&1
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 4: PostCSS Setup
echo ========================
echo Installing compatible PostCSS setup...
echo Step 4: PostCSS Setup >> %LOG_FILE%
echo ====================== >> %LOG_FILE%
echo Running: npm install postcss@latest autoprefixer@latest >> %LOG_FILE%
call npm install postcss@latest autoprefixer@latest >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: PostCSS install failed with exit code !errorLevel! >> %LOG_FILE%
    echo ERROR: PostCSS install failed!
) else (
    echo SUCCESS: PostCSS install completed >> %LOG_FILE%
    echo SUCCESS: PostCSS install completed
)
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 5: Build Attempt 1
echo ========================
echo Building Next.js application (with PostCSS config)...
echo Step 5: Build Attempt 1 >> %LOG_FILE%
echo ======================== >> %LOG_FILE%
echo Current PostCSS config content: >> %LOG_FILE%
if exist postcss.config.mjs (
    type postcss.config.mjs >> %LOG_FILE%
) else (
    echo PostCSS config file not found >> %LOG_FILE%
)
echo. >> %LOG_FILE%
echo Running: npm run build >> %LOG_FILE%
call npm run build >> %LOG_FILE% 2>&1
set BUILD_RESULT=!errorLevel!

if !BUILD_RESULT! neq 0 (
    echo ERROR: First build attempt failed with exit code !BUILD_RESULT! >> %LOG_FILE%
    echo ERROR: First build attempt failed!
    
    echo.
    echo ========================
    echo Step 6: Build Attempt 2
    echo ========================
    echo Build failed. Trying without PostCSS config...
    echo Step 6: Build Attempt 2 >> %LOG_FILE%
    echo ======================== >> %LOG_FILE%
    
    if exist postcss.config.mjs (
        echo Temporarily disabling custom PostCSS config...
        echo Backing up PostCSS config >> %LOG_FILE%
        ren postcss.config.mjs postcss.config.mjs.backup
    )
    
    echo Running: npm run build (without PostCSS config) >> %LOG_FILE%
    call npm run build >> %LOG_FILE% 2>&1
    set BUILD_RESULT=!errorLevel!
    
    if exist postcss.config.mjs.backup (
        echo Restoring PostCSS config...
        echo Restoring PostCSS config >> %LOG_FILE%
        ren postcss.config.mjs.backup postcss.config.mjs
    )
    
    if !BUILD_RESULT! neq 0 (
        echo ERROR: Second build attempt failed with exit code !BUILD_RESULT! >> %LOG_FILE%
        echo ERROR: Second build attempt failed!
        
        echo.
        echo ========================
        echo Step 7: Build Attempt 3
        echo ========================
        echo Trying with TailwindCSS v3...
        echo Step 7: Build Attempt 3 >> %LOG_FILE%
        echo ======================== >> %LOG_FILE%
        echo Installing TailwindCSS v3 >> %LOG_FILE%
        call npm install tailwindcss@^3.0.0 --save-dev >> %LOG_FILE% 2>&1
        
        echo Running: npm run build (with TailwindCSS v3) >> %LOG_FILE%
        call npm run build >> %LOG_FILE% 2>&1
        set BUILD_RESULT=!errorLevel!
        
        if !BUILD_RESULT! neq 0 (
            echo ERROR: Third build attempt failed with exit code !BUILD_RESULT! >> %LOG_FILE%
            echo ERROR: All build attempts failed!
        ) else (
            echo SUCCESS: Build completed with TailwindCSS v3 >> %LOG_FILE%
            echo SUCCESS: Build completed with TailwindCSS v3!
        )
    ) else (
        echo SUCCESS: Build completed without PostCSS config >> %LOG_FILE%
        echo SUCCESS: Build completed without PostCSS config!
    )
) else (
    echo SUCCESS: First build attempt completed >> %LOG_FILE%
    echo SUCCESS: First build attempt completed!
)

echo.
echo ========================
echo Step 8: Database Setup
echo ========================
echo Creating data directory...
echo Step 8: Database Setup >> %LOG_FILE%
echo ======================= >> %LOG_FILE%
if not exist data mkdir data
echo Data directory created >> %LOG_FILE%

echo Initializing database...
echo Running: node scripts\init-db.js >> %LOG_FILE%
call node scripts\init-db.js >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: Database initialization failed with exit code !errorLevel! >> %LOG_FILE%
    echo ERROR: Database initialization failed!
) else (
    echo SUCCESS: Database initialization completed >> %LOG_FILE%
    echo SUCCESS: Database initialization completed!
)
echo. >> %LOG_FILE%

echo.
echo ========================
echo Step 9: IIS Preparation
echo ========================
echo Copying server file for IIS...
echo Step 9: IIS Preparation >> %LOG_FILE%
echo ======================== >> %LOG_FILE%
copy server.ts server.js >> %LOG_FILE% 2>&1
if !errorLevel! neq 0 (
    echo ERROR: Server file copy failed with exit code !errorLevel! >> %LOG_FILE%
    echo ERROR: Server file copy failed!
) else (
    echo SUCCESS: Server file copied >> %LOG_FILE%
    echo SUCCESS: Server file copied!
)

echo.
echo ========================================
echo Build Process Complete!
echo ========================================
echo Build completed at %date% %time% >> %LOG_FILE%
echo Final build result: !BUILD_RESULT! >> %LOG_FILE%
echo ========================================= >> %LOG_FILE%

if !BUILD_RESULT! equ 0 (
    echo ✅ Build successful!
    echo SUCCESS: Build completed successfully! >> %LOG_FILE%
    echo.
    echo Next steps:
    echo 1. Run: deployment\setup-iis.ps1 ^(as Administrator^)
    echo 2. Run: deployment\deploy.bat
    echo 3. Start IIS site
) else (
    echo ❌ Build failed. 
    echo FAILURE: Build process failed >> %LOG_FILE%
    echo.
    echo 📋 DETAILED LOG SAVED TO: %LOG_FILE%
    echo.
    echo Please share the contents of this log file for debugging:
    echo %LOG_FILE%
)

echo.
echo 📋 Complete build log available at: %LOG_FILE%
echo.
pause 