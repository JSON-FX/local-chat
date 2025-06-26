@echo off
echo ========================================
echo   Quick Fix - Web Access Issues
echo ========================================

set TARGET_DIR=C:\inetpub\wwwroot\Github\local-chat

echo.
echo Current situation:
echo - Node.js server is running on localhost:3000
echo - IIS site cannot access it properly
echo.

echo Possible solutions:
echo [1] Use simple proxy (recommended)
echo [2] Install IISNode module
echo [3] Test direct access methods
echo [4] Check system status

choice /c 1234 /m "Select solution"

if errorlevel 4 goto :check_status
if errorlevel 3 goto :test_access
if errorlevel 2 goto :install_iisnode
if errorlevel 1 goto :proxy_setup

:proxy_setup
echo ========================================
echo   Setting up Simple Proxy
echo ========================================

echo.
echo Backing up current web.config...
cd /d "%TARGET_DIR%"
if exist web.config (
    copy web.config web.config.original
    echo Original web.config backed up
)

echo.
echo Installing proxy web.config...
copy "%~dp0..\web.config.proxy" web.config
if errorlevel 1 (
    echo ERROR: Could not copy proxy config
    pause
    exit /b 1
)

echo Proxy configuration installed!
echo.
echo Now testing...
goto :test_access

:install_iisnode
echo ========================================
echo   Installing IISNode
echo ========================================
start "%~dp0install-iisnode.bat"
pause
goto :eof

:test_access
echo ========================================
echo   Testing Access Methods
echo ========================================

echo.
echo Testing DNS resolution...
nslookup lgu-chat.lguquezon.com.local
if errorlevel 1 (
    echo DNS resolution failed
    echo Try direct IP access instead
)

echo.
echo Testing direct IP access...
echo Opening: http://192.168.32.6
start http://192.168.32.6

echo.
echo Testing localhost access...
echo Opening: http://localhost
start http://localhost

echo.
echo Testing domain access...
echo Opening: http://lgu-chat.lguquezon.com.local
start http://lgu-chat.lguquezon.com.local

echo.
echo Check which one works in your browser
pause
goto :eof

:check_status
echo ========================================
echo   System Status Check
echo ========================================

echo.
echo Checking IIS sites...
%windir%\system32\inetsrv\appcmd list sites

echo.
echo Checking running processes...
tasklist | findstr node

echo.
echo Checking port 3000...
netstat -an | findstr :3000

echo.
echo Checking port 80...
netstat -an | findstr :80

echo.
echo Checking IIS modules...
%windir%\system32\inetsrv\appcmd list modules | findstr iisnode

pause
goto :eof 