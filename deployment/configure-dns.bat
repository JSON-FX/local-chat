@echo off
echo Configuring DNS for lgu-chat.local...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as administrator - Good!
) else (
    echo This script must be run as administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Get server IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set SERVER_IP=%%a
    goto :continue
)

:continue
REM Remove leading spaces
set SERVER_IP=%SERVER_IP: =%

echo Server IP detected: %SERVER_IP%

REM Create DNS A record using dnscmd
echo Creating DNS A record for lgu-chat.local...
dnscmd /recordadd lgu-chat.local @ A %SERVER_IP%
dnscmd /recordadd lgu-chat.local www A %SERVER_IP%

REM Alternative: Add to hosts file for local testing
echo.
echo Adding entry to hosts file for local access...
echo %SERVER_IP% lgu-chat.local >> C:\Windows\System32\drivers\etc\hosts
echo %SERVER_IP% www.lgu-chat.local >> C:\Windows\System32\drivers\etc\hosts

echo.
echo DNS configuration completed!
echo Users can now access the application at: http://lgu-chat.local
echo.
echo Note: For network-wide access, ensure:
echo 1. DNS server is properly configured
echo 2. Firewall allows HTTP traffic on port 80
echo 3. Client computers use this server as DNS server
pause 