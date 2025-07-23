# 🚨 ACTION REQUIRED: UniFi Configuration

## For IT Administrator / Network Admin:

The LGU-Chat application is **READY** but requires UniFi configuration to enable domain access for 1000+ users.

### What's Ready:
- ✅ Production server: 192.168.32.14
- ✅ DNS server: Running and resolving lgu-chat.lguquezon.internal
- ✅ Web application: Accessible and running
- ✅ Domain configured: lgu-chat.lguquezon.internal → 192.168.32.14

### What's Needed (UniFi Configuration):

1. **Login to UniFi Controller** at https://192.168.32.1

2. **Navigate to**: Settings → Networks → [Your LAN Network]

3. **Find**: DHCP Name Server section

4. **Change from**: Auto/Default
   **Change to**: Manual

5. **Enter DNS Servers**:
   - DNS 1: `192.168.32.14` (Our DNS server)
   - DNS 2: `8.8.8.8` (Google backup)

6. **Save Changes**

### Timeline:
- New devices: Immediate
- Existing devices: 1-24 hours (DHCP renewal)
- Force update: Reconnect devices from UniFi

### After Configuration:
All employees will be able to access: http://lgu-chat.lguquezon.internal

### Test Command for Verification:
From any user computer after DHCP renewal:
```
nslookup lgu-chat.lguquezon.internal
```
Should return: 192.168.32.14

---
**Server Admin Contact**: [Your contact info]
**Configuration Status**: WAITING FOR UNIFI DNS UPDATE
