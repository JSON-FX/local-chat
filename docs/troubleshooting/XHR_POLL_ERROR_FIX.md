# XHR Poll Error Fix

## Immediate Solutions

### 1. Clear Browser Data (Most Common Fix)
1. Open Developer Tools (F12)
2. Right-click the Refresh button
3. Select "Empty Cache and Hard Reload"
4. Clear cookies for chat.lgu.local
5. Try logging in again

### 2. Disable Browser Extensions
- Ad blockers (especially uBlock Origin, AdBlock)
- Privacy extensions (Privacy Badger, Ghostery)
- VPN browser extensions
- Try in Incognito/Private mode with extensions disabled

### 3. Check Firewall/Antivirus
Some security software blocks WebSocket/XHR:
- Windows Defender
- Corporate firewalls
- Antivirus real-time protection

### 4. Browser-Specific Fixes

#### Chrome/Edge:
```
chrome://flags/#block-insecure-private-network-requests
Set to "Disabled"
```

#### Firefox:
- Check `about:config`
- Search for `network.websocket`
- Ensure WebSocket is enabled

### 5. Test Connection
Visit: http://chat.lgu.local/socket-debug.html
This will show detailed error information.

## Technical Details

The XHR polling error occurs when:
1. CORS blocks the request
2. Cookie/session issues
3. Network timeout
4. Browser security policies

## What I've Fixed:
✅ Updated nginx configuration for better Socket.IO handling
✅ Fixed CORS headers
✅ Increased timeouts
✅ Proper WebSocket upgrade headers

## Quick Test:
Open browser console (F12) and run:
```javascript
// Test Socket.IO connection
const testSocket = io('http://chat.lgu.local', {
  transports: ['polling', 'websocket'],
  withCredentials: true
});
testSocket.on('connect', () => console.log('Connected!'));
testSocket.on('connect_error', (e) => console.error('Error:', e));
```

## If Still Not Working:
1. Check if you're behind a proxy
2. Try a different browser
3. Test on a different device
4. Check browser console for specific errors
