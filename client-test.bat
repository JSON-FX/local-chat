@echo off
echo === LGU-Chat DNS Test Script ===
echo.
echo Testing DNS Server at 192.168.32.14...
echo.
nslookup lgu-chat.internal 192.168.32.14
echo.
echo If you see "192.168.32.14" above, DNS is working!
echo.
echo Current DNS servers on this device:
ipconfig /all | findstr /C:"DNS Servers"
echo.
echo To use lgu-chat.internal, add 192.168.32.14 as your DNS server.
echo Or just use: http://192.168.32.14
echo.
pause
