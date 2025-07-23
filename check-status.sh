#!/bin/bash
echo "=== LGU-Chat Status Check ==="
echo ""
echo "1. PM2 Process Status:"
pm2 status lgu-chat

echo ""
echo "2. Application Health Check:"
echo -n "   Via Domain: "
curl -s -o /dev/null -w "%{http_code}\n" http://lgu-chat.lan
echo -n "   Via IP: "
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.32.14

echo ""
echo "3. Database Status:"
if [ -f data/localchat.db ]; then
    echo "Database file exists: $(ls -lh data/localchat.db | awk '{print $5}')"
else
    echo "Database file not found!"
fi

echo ""
echo "4. Nginx Status:"
sudo systemctl status nginx | grep "Active:"

echo ""
echo "5. Access URLs:"
echo "   Local (this server): http://lgu-chat.lan"
echo "   Network (other devices): http://192.168.32.14"
echo ""
echo "   For domain access on other devices, see NETWORK_ACCESS.md"

echo ""
echo "6. Default Credentials:"
echo "   Username: admin"
echo "   Password: admin123 (CHANGE THIS IMMEDIATELY!)"
