# LGU-Chat Network Access Guide

## For Other Devices on the Local Network

### Option 1: Direct IP Access (Easiest - No Configuration Needed)
Simply open your web browser and go to:
```
http://192.168.32.14
```

### Option 2: Using Domain Name (Recommended for Regular Use)
To use the domain name `lgu-chat.lan`, you need to add an entry to your device's hosts file:

#### On Windows:
1. Open Notepad as Administrator
2. Open file: `C:\Windows\System32\drivers\etc\hosts`
3. Add this line at the end:
   ```
   192.168.32.14 lgu-chat.lan
   ```
4. Save the file
5. Access: http://lgu-chat.lan

#### On macOS/Linux:
1. Open terminal
2. Run: `sudo nano /etc/hosts`
3. Add this line:
   ```
   192.168.32.14 lgu-chat.lan
   ```
4. Save (Ctrl+O, Enter, Ctrl+X)
5. Access: http://lgu-chat.lan

#### On Android (Rooted):
1. Use a hosts editor app from Play Store
2. Add: `192.168.32.14 lgu-chat.lan`
3. Save and restart browser

#### On iOS/Android (Non-rooted):
- Just use the IP address: http://192.168.32.14
- Domain names require root/jailbreak access to modify hosts file

### Alternative: Local DNS Server Setup
If you have many devices, consider setting up a local DNS server (like Pi-hole or dnsmasq) 
on your network to automatically resolve lgu-chat.lan to 192.168.32.14 for all devices.

## Default Login Credentials
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT**: Change the default password immediately after first login!

## Why .lan?
The `.lan` domain is specifically reserved for local area networks and won't conflict 
with internet domains or mDNS services like `.local` might.
