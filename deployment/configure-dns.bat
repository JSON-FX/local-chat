@echo off
echo Configuring DNS for lgu-chat.lguquezon.com.local...

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

REM Set server IP address (update this to match your server's IP)
set SERVER_IP=192.168.32.6

echo Server IP configured: %SERVER_IP%

REM Create DNS A record using dnscmd for existing domain
echo Creating DNS A record for lgu-chat in lguquezon.com.local zone...
dnscmd /recordadd lguquezon.com.local lgu-chat A %SERVER_IP%

REM Also create a record in the local zone if it exists
dnscmd /recordadd lguquezon.local lgu-chat A %SERVER_IP% 2>nul

REM Alternative: Add to hosts file for local testing
echo.
echo Adding entry to hosts file for local access...
echo %SERVER_IP% lgu-chat.lguquezon.com.local >> C:\Windows\System32\drivers\etc\hosts
echo %SERVER_IP% lgu-chat.lguquezon.local >> C:\Windows\System32\drivers\etc\hosts

echo.
echo DNS configuration completed!
echo Users can now access the application at: http://lgu-chat.lguquezon.com.local
echo.
echo Note: For network-wide access, ensure:
echo 1. DNS server is properly configured
echo 2. Firewall allows HTTP traffic on port 80
echo 3. Client computers use this server as DNS server (192.168.32.6)
echo 4. The DNS record you created manually matches this configuration
pause 