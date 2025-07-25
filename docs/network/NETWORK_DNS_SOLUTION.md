# Complete Network Access Solution for LGU-Chat

## 🔍 Understanding the Issue
The domain `lgu-chat.lguquezon.internal` works ONLY if devices use our DNS server (192.168.32.14).
By default, devices use your router's DNS (192.168.32.1), which doesn't know about `lgu-chat.lguquezon.internal`.

## ✅ Verified Working Components
1. DNS Server on 192.168.32.14 ✓
2. Domain resolution lgu-chat.lguquezon.internal → 192.168.32.14 ✓
3. Web application accessible via IP ✓
4. Web application configured for domain ✓

## 🚀 Quick Solutions

### Option 1: Just Use IP (Instant, No Config)
Tell everyone to access:
```
http://192.168.32.14
```
This works immediately on ALL devices!

### Option 2: Configure UniFi Router (Best for Network-Wide Access)
1. Login to UniFi at https://192.168.32.1
2. Settings → Networks → Default (or your LAN name)
3. Scroll to "DHCP Name Server"
4. Change "Auto" to "Manual"
5. Set:
   - Server 1: `192.168.32.14`
   - Server 2: `8.8.8.8`
6. Save
7. Wait for devices to renew DHCP (or reboot them)

### Option 3: Manual Device Configuration (For Testing)
Configure DNS on individual devices to use 192.168.32.14

**Windows Quick Steps:**
1. Open Command Prompt as Admin
2. Run these commands:
```batch
netsh interface ip set dns "Wi-Fi" static 192.168.32.14
netsh interface ip add dns "Wi-Fi" 8.8.8.8 index=2
ipconfig /flushdns
```
(Replace "Wi-Fi" with "Ethernet" if wired)

**To revert:**
```batch
netsh interface ip set dns "Wi-Fi" dhcp
```

## 📱 Testing From Any Device

**Test 1: Can you reach the DNS server?**
```
nslookup google.com 192.168.32.14
```
Should return Google's IP

**Test 2: Can you resolve lgu-chat.lguquezon.internal?**
```
nslookup lgu-chat.lguquezon.internal 192.168.32.14
```
Should return 192.168.32.14

**Test 3: Is your device using our DNS?**
```
# Windows
ipconfig /all | findstr "DNS"

# Mac/Linux
cat /etc/resolv.conf
```

## 🎯 Recommended Approach

**For Immediate Access:** Use http://192.168.32.14

**For Permanent Domain Access:** Configure UniFi DHCP to distribute DNS server 192.168.32.14

## 📋 Copy-Paste Instructions for Users

Send this to users:
```
To access LGU-Chat:
1. Open your browser
2. Go to: http://192.168.32.14
3. Login with provided credentials

For domain access (lgu-chat.lguquezon.internal), IT needs to update router DNS settings.
```
