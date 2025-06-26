@echo off
echo ========================================
echo   Deploying Fixed Server to Windows
echo ========================================

set SOURCE_DIR=%~dp0..
set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat
set BACKUP_DIR=%TARGET_DIR%\backup

echo.
echo Source directory: %SOURCE_DIR%
echo Target directory: %TARGET_DIR%
echo.

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo Created backup directory: %BACKUP_DIR%
)

REM Backup current server.js if it exists
if exist "%TARGET_DIR%\server.js" (
    echo Backing up current server.js...
    copy "%TARGET_DIR%\server.js" "%BACKUP_DIR%\server-backup-%DATE:/=-%-%TIME::=-%.js"
    if errorlevel 1 (
        echo ERROR: Failed to backup current server.js
        pause
        exit /b 1
    )
    echo Current server.js backed up successfully
)

REM Copy the fixed server file
echo.
echo Copying fixed server file...
copy "%SOURCE_DIR%\server-fixed.js" "%TARGET_DIR%\server.js"
if errorlevel 1 (
    echo ERROR: Failed to copy server-fixed.js
    pause
    exit /b 1
)

echo Fixed server.js deployed successfully!
echo.
echo ========================================
echo   Testing Server
echo ========================================

REM Test the server syntax
echo Testing server syntax...
cd /d "%TARGET_DIR%"
node --check server.js
if errorlevel 1 (
    echo ERROR: Server syntax check failed!
    echo Restoring backup...
    if exist "%BACKUP_DIR%\server-backup-*.js" (
        for /f %%i in ('dir /b /o-d "%BACKUP_DIR%\server-backup-*.js"') do (
            copy "%BACKUP_DIR%\%%i" "%TARGET_DIR%\server.js"
            goto :restored
        )
        :restored
        echo Backup restored
    )
    pause
    exit /b 1
)

echo Server syntax check passed!
echo.
echo ========================================
echo   Ready to Start
echo ========================================
echo.
echo The fixed server is ready. You can now:
echo 1. Test manually: cd "%TARGET_DIR%" && node server.js
echo 2. Or start through IIS
echo.
echo Default credentials:
echo Username: admin
echo Password: admin123
echo.
pause 