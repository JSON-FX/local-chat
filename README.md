# LGU-Chat 📱

A real-time chat application built with Next.js, Socket.io, and SQLite for Local Government Units (LGU).

> ⚠️ **Beta Version Notice**: This is a beta version. Your messages, files, and account data may be removed during major updates. Please backup important information regularly.

## 🚀 Quick Start

### Development Mode (Team Access via IP)

For development where team members need to access the app via your IP address:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

3. **Check Your Network IP**
   ```bash
   npm run get-ip
   ```
   This will show all available network interfaces and their IP addresses.

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The server will automatically:
   - Bind to `0.0.0.0` (all network interfaces)
   - Display both localhost and network IP addresses
   - Allow connections from other devices on the same network

5. **Access the Application**
   - **Local access**: `http://localhost:3000`
   - **Network access**: `http://YOUR_IP:3000` (e.g., `http://192.168.1.100:3000`)
   - Share the network URL with your team for testing

### Alternative Development Command
```bash
npm run dev:ip
```
This command first shows your IP addresses, then starts the server.

---

## 🏭 Production Mode

### Production Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm run start
   ```

3. **Access the Application**
   - **Local**: `http://localhost:3000`
   - **Network**: `http://YOUR_SERVER_IP:3000`

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for development:

```env
# Database
DATABASE_PATH=./data/localchat.db

# JWT Secret (REQUIRED for security)
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
NODE_ENV=production
PORT=3000
SERVER_HOST=0.0.0.0

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Custom IPs (for multiple development environments)
CUSTOM_ALLOWED_IPS=192.168.1.100,192.168.0.50,10.0.0.15
```

### Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **Security Warning**: Change the default password immediately after first login!

---

## 🌐 Network Access Setup

### For Development Teams

1. **Ensure all devices are on the same network** (WiFi/LAN)
2. **Check firewall settings** - make sure port 3000 is allowed
3. **Find your IP address** using `npm run get-ip`
4. **Share the network URL** with your team: `http://YOUR_IP:3000`

### Firewall Configuration (Windows)

```powershell
# Allow HTTP traffic on port 3000
New-NetFirewallRule -DisplayName "LGU-Chat Dev" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Network Troubleshooting

If team members can't access your app:

1. **Check your IP address**: `npm run get-ip`
2. **Verify firewall**: Temporarily disable to test
3. **Test locally first**: Access `http://localhost:3000`
4. **Ping test**: Have team members ping your IP
5. **Port test**: Use `telnet YOUR_IP 3000` to test port access

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (accessible via IP) |
| `npm run dev:ip` | Show IP addresses, then start dev server |
| `npm run get-ip` | Display all network IP addresses |
| `npm run build` | Build the application for production |
| `npm run start` | Start production server |
| `npm run init-db` | Initialize the database |
| `npm run fresh-db` | Reset database (fresh start) |
| `npm run db-reset` | Force reset database |
| `npm run lint` | Run code linting |

---

## 🗄️ Database Management

### Automatic Migrations

The application automatically runs database migrations on startup. When you start the application:
- It checks for any missing columns or tables
- Applies necessary schema changes automatically
- Logs migration progress to the console

No manual intervention is required for migrations.

### SQLite Database Location
- **Development**: `./database.sqlite`
- **Production**: `./data/localchat.db`

### Database Commands
```bash
# Initialize new database
npm run init-db

# Reset database (WARNING: Deletes all data)
npm run fresh-db

# Force reset (no prompts)
npm run db-reset
```

### Backup Database
```bash
# Copy database file
cp database.sqlite backup-$(date +%Y%m%d).sqlite
```

---

## 📁 File Storage

### Upload Directory
- **Development**: `./uploads/`
- **Production**: `./uploads/`

### File Size Limits
- **Default**: 10MB per file
- **Configure**: Set `MAX_FILE_SIZE` in environment variables

---

## 🛠️ Troubleshooting

### Common Development Issues

**Can't access via IP:**
1. Check firewall settings
2. Verify you're using the correct IP from `npm run get-ip`
3. Ensure all devices are on the same network
4. Try accessing `http://localhost:3000` first

**Database errors:**
1. Run `npm run init-db`
2. Check file permissions
3. For fresh start: `npm run fresh-db`

**Socket.io connection issues:**
1. Check network connectivity
2. Verify firewall allows WebSocket connections
3. Test with localhost first

### Production Issues

**IIS deployment problems:**
1. Check Event Viewer → Application logs
2. Verify Node.js installation
3. Ensure iisnode module is installed
4. Check file permissions

**Performance issues:**
1. Monitor CPU/RAM usage
2. Check database size
3. Review upload file sizes
4. Enable IIS compression

---

## 🔐 Security Considerations

### Development
- Only use on trusted networks
- Don't store sensitive data in beta
- Change default passwords
- Regular backups recommended

### Production
- **Change default admin password**
- **Set strong JWT secret**
- **Configure HTTPS**
- **Regular security updates**
- **Monitor access logs**
- **Backup data regularly**

---

## 📱 Features

- ✅ Real-time messaging with Socket.io
- ✅ File sharing and uploads
- ✅ Group conversations
- ✅ User management
- ✅ Admin panel
- ✅ Desktop notifications
- ✅ Mobile responsive design
- ✅ Dark/light theme support
- ✅ Network IP access for development

---

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 19
- **Backend**: Express.js with Socket.io
- **Database**: SQLite with custom ORM
- **Authentication**: JWT tokens
- **File Storage**: Local filesystem
- **UI**: Tailwind CSS with Radix UI components

---

## 🤝 Beta Testing Guidelines

### For Users
- **Backup important data** regularly
- **Report bugs** to administrators
- **Don't store critical information** exclusively in the app
- **Expect occasional resets** during major updates

### For Developers
- **Monitor system performance**
- **Collect user feedback**
- **Test thoroughly** before releases
- **Communicate updates** to users
- **Maintain regular backups**

---

## 📞 Support

For technical support or bug reports:
1. Check the troubleshooting section above
2. Review console/server logs
3. Test with a fresh database
4. Contact system administrator

---

**LGU-Chat** - Developed by Management Information System Section (MISS)  
Municipality Of Quezon Bukidnon 8715 Philippines  
All Rights Reserved 2025 