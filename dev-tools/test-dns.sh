#!/bin/bash
echo "=== DNS Server Test ==="
echo ""
echo "1. Local DNS Resolution Test:"
echo -n "   lgu-chat.internal: "
dig @127.0.0.1 lgu-chat.internal +short
echo -n "   chat.internal: "
dig @127.0.0.1 chat.internal +short
echo ""
echo "2. External DNS Test (from network perspective):"
echo -n "   DNS query to 192.168.32.14 for lgu-chat.internal: "
dig @192.168.32.14 lgu-chat.internal +short
echo ""
echo "3. Web Access Test:"
curl -s -o /dev/null -w "   http://lgu-chat.internal - Status: %{http_code}\n" http://lgu-chat.internal
echo ""
echo "4. DNS Server Status:"
sudo systemctl is-active dnsmasq
echo ""
echo "=== Configuration Summary ==="
echo "DNS Server IP: 192.168.32.14"
echo "Domains configured:"
echo "  - lgu-chat.internal → 192.168.32.14"
echo "  - chat.internal → 192.168.32.14"
echo "  - lgu-chat.lan → 192.168.32.14"
echo ""
echo "To use from other devices:"
echo "  Set DNS server to: 192.168.32.14"
