@echo off
echo ========================================
echo   IISNode Installation Helper
echo ========================================

echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found in PATH
    echo Please install Node.js first
    pause
    exit /b 1
)

echo.
echo Node.js found. Checking IISNode...

echo.
echo To install IISNode:
echo 1. Download from: https://github.com/Azure/iisnode/releases
echo 2. Run: iisnode-full-v0.2.26-x64.msi
echo 3. Or use: choco install iisnode (if Chocolatey is installed)

echo.
echo Alternative - Use Application Request Routing (ARR):
echo This can proxy requests to your Node.js server without IISNode

echo.
echo Choose your method:
echo [1] Download IISNode manually
echo [2] Try Chocolatey install
echo [3] Setup ARR proxy instead
echo [4] Exit

choice /c 1234 /m "Select option"

if errorlevel 4 goto :eof
if errorlevel 3 goto :arr_setup
if errorlevel 2 goto :choco_install
if errorlevel 1 goto :manual_download

:manual_download
echo Opening GitHub releases page...
start https://github.com/Azure/iisnode/releases
echo Download and install iisnode-full-v0.2.26-x64.msi
pause
goto :eof

:choco_install
echo Attempting Chocolatey install...
choco install iisnode -y
if errorlevel 1 (
    echo Chocolatey not found or install failed
    goto :manual_download
)
echo IISNode installed via Chocolatey
pause
goto :eof

:arr_setup
echo ========================================
echo   Setting up ARR Proxy
echo ========================================
echo.
echo This will configure IIS to proxy to Node.js on port 3000
echo without requiring IISNode module.
echo.
pause

REM Create a simple ARR proxy web.config
echo Creating ARR proxy configuration...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="ReverseProxyInboundRule1" stopProcessing="true"^>
echo           ^<match url=".*" /^>
echo           ^<action type="Rewrite" url="http://localhost:3000/{R:0}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > web.config.arr

echo ARR proxy configuration created as web.config.arr
echo.
echo To use this:
echo 1. Install Application Request Routing in IIS
echo 2. Replace web.config with web.config.arr
echo 3. Ensure Node.js server is running on port 3000
echo.
pause
goto :eof 