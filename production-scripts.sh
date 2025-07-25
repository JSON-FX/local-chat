#!/bin/bash

# LGU-Chat Production Management Scripts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== LGU-Chat Production Management ===${NC}"
echo ""

case "${1:-status}" in
  "start")
    echo -e "${GREEN}Starting LGU-Chat...${NC}"
    pm2 start ecosystem.config.js --env production
    ;;
  "stop")
    echo -e "${YELLOW}Stopping LGU-Chat...${NC}"
    pm2 stop lgu-chat
    ;;
  "restart")
    echo -e "${YELLOW}Restarting LGU-Chat...${NC}"
    pm2 restart lgu-chat
    ;;
  "status"|"info")
    echo -e "${BLUE}LGU-Chat Status:${NC}"
    pm2 status
    echo ""
    echo -e "${BLUE}Server URLs:${NC}"
    echo -e "  🌐 Domain: http://chat.lgu.local:3000"
    echo -e "  📍 Local IP: http://192.168.32.14:3000"
    ;;
  "logs")
    echo -e "${BLUE}Showing LGU-Chat logs (Press Ctrl+C to exit):${NC}"
    pm2 logs lgu-chat
    ;;
  "error-logs")
    echo -e "${RED}Showing LGU-Chat error logs:${NC}"
    pm2 logs lgu-chat --err --lines 50
    ;;
  "deploy")
    echo -e "${GREEN}Deploying LGU-Chat updates...${NC}"
    echo "1. Pulling latest changes..."
    git pull
    echo "2. Installing dependencies..."
    npm install
    echo "3. Building application..."
    npm run build
    echo "4. Restarting PM2..."
    pm2 restart lgu-chat
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    ;;
  "backup")
    echo -e "${BLUE}Creating database backup...${NC}"
    mkdir -p backups
    cp data/localchat.db "backups/localchat-$(date +%Y%m%d-%H%M%S).db"
    echo -e "${GREEN}✅ Database backed up to backups/ directory${NC}"
    ;;
  "monitor")
    echo -e "${BLUE}Opening PM2 monitoring (Press Ctrl+C to exit):${NC}"
    pm2 monit
    ;;
  "help")
    echo -e "${BLUE}Available commands:${NC}"
    echo "  start      - Start the application"
    echo "  stop       - Stop the application"
    echo "  restart    - Restart the application"
    echo "  status     - Show application status (default)"
    echo "  logs       - Show live logs"
    echo "  error-logs - Show error logs"
    echo "  deploy     - Deploy updates (git pull, build, restart)"
    echo "  backup     - Create database backup"
    echo "  monitor    - Open PM2 monitoring dashboard"
    echo "  help       - Show this help"
    echo ""
    echo -e "${YELLOW}Usage: ./production-scripts.sh [command]${NC}"
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    echo "Use './production-scripts.sh help' to see available commands"
    exit 1
    ;;
esac
