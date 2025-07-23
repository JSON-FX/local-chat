# Network Configuration Runbook

## DNS and DHCP Configuration

### UniFi Controller Settings
**Location:** https://192.168.32.1 → Settings → Networks → Default/LAN

#### Required DHCP Configuration:
1. **Domain Name (Search Suffix):** `lgu.local`
2. **DNS Servers:**
   - Primary: `192.168.32.14` (Local DNS server with dnsmasq)
   - Secondary: `8.8.8.8` (Google DNS fallback)

#### Configuration Steps:
1. Login to UniFi Controller at https://192.168.32.1
2. Navigate to Settings → Networks  
3. Select your LAN network (usually "Default")
4. Scroll to "DHCP Name Server" section
5. Change from "Auto" to "Manual"
6. Set DNS servers as specified above
7. Set Domain Name to: `lgu.local`
8. Apply settings

**Status:** ⚠️ **ACTION REQUIRED** - UniFi DHCP must be configured by network administrator

### DNS Server Configuration
**Server:** 192.168.32.14 (lguquezon server)  
**Service:** dnsmasq  
**Config File:** `/etc/dnsmasq.d/lgu.conf`  
**Status:** ✅ Active and running

**Current Configuration:**
```
# Additional LGU configuration
# New server and address configurations
server=/lguquezon.internal/192.168.32.14
address=/lgu-chat.lguquezon.internal/192.168.32.14

# Additional rebind domain configuration
rebind-domain-ok=/lguquezon.internal/
```

## Service Monitoring

### DNS Log Monitoring
- **Log File:** `/var/log/dnsmasq.log`
- **Monitoring Script:** `/usr/local/bin/dns-monitor.sh`
- **Schedule:** Every 5 minutes via cron
- **Alerts:** Email notifications to admin@lgu.local for:
  - SERVFAIL spikes (>10 in 5 minutes)
  - Rebind attack attempts (>5 in 5 minutes)
- **Status:** ✅ Monitoring active

### Cron Job Configuration
```
*/5 * * * * /usr/local/bin/dns-monitor.sh
```

## Change Documentation
- **Date:** 2025-07-23 03:35:38
- **Administrator:** System Admin
- **Changes Completed:**
  1. ✅ DNS monitoring script created and deployed
  2. ✅ Cron job configured for automated monitoring
  3. ✅ Configuration backup created
  4. ⚠️ UniFi DHCP configuration pending (requires manual setup)

## Backup Information
- **Configuration backup:** `/etc/dnsmasq.d/lgu.conf.backup.20250723`
- **Backup created:** 2025-07-23 03:35:38
- **Original config:** `/etc/dnsmasq.d/lgu.conf`

## Next Steps Required
1. **CRITICAL:** Configure UniFi DHCP settings:
   - Set Domain Name (search suffix) to `lgu.local`
   - Confirm 192.168.32.14 is the first DNS server offered
   - Add 8.8.8.8 as secondary DNS
2. Test DHCP clients receive correct DNS configuration
3. Verify domain resolution works network-wide

## Troubleshooting
- **DNS Service Status:** `systemctl status dnsmasq`
- **Monitor Logs:** `tail -f /var/log/dnsmasq.log`
- **Monitor Alerts:** `tail -f /var/log/dns-monitor.log`
- **Test DNS Resolution:** `nslookup lgu-chat.lguquezon.internal 192.168.32.14`

