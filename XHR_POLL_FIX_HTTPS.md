# XHR Poll Error Fix - HTTPS Setup

## Current Configuration
- ✅ HTTPS enabled on port 443
- ✅ HTTP redirects to HTTPS (301)
- ✅ SSL certificate installed
- ✅ Socket.IO configured for HTTPS origins
- ✅ Nginx properly configured for WebSocket upgrade

## Browser Steps to Fix XHR Poll Error

### 1. Accept Self-Signed Certificate
1. Visit https://chat.lgu.local
2. Click "Advanced" → "Proceed to chat.lgu.local (unsafe)"
3. This accepts the self-signed certificate

### 2. Clear Everything
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### 3. Test Connection
Visit: https://chat.lgu.local/https-test.html

### 4. Browser-Specific Fixes

#### Chrome/Edge:
- Open chrome://flags/#allow-insecure-localhost
- Enable "Allow invalid certificates for resources loaded from localhost"
- Restart browser

#### Firefox:
- Visit about:config
- Set `network.websocket.allowInsecureFromHTTPS` to true
- Accept the certificate warning

### 5. Common Issues & Solutions

**Issue: "net::ERR_CERT_AUTHORITY_INVALID"**
Solution: Accept the self-signed certificate first

**Issue: "Mixed Content Blocked"**
Solution: Ensure all resources use HTTPS

**Issue: "CORS Policy Blocked"**
Solution: Clear cache and cookies

## Quick Debug Commands

From browser console:
```javascript
// Test Socket.IO
const testSocket = io('https://chat.lgu.local', {
    transports: ['polling'],
    withCredentials: true,
    rejectUnauthorized: false
});
testSocket.on('connect', () => console.log('Connected!'));
testSocket.on('connect_error', (e) => console.error('Error:', e));
```

## Server Verification
```bash
# Check HTTPS
curl -k -I https://chat.lgu.local

# Check Socket.IO
curl -k "https://chat.lgu.local/socket.io/?EIO=4&transport=polling"

# Check redirect
curl -I http://chat.lgu.local
```

## If Still Not Working

1. **Disable ALL browser extensions**
2. **Use Incognito mode**
3. **Try different browser**
4. **Check firewall/antivirus**
5. **Ensure no VPN/proxy**

The server is configured correctly. The issue is almost certainly browser-side certificate or security policy related.
