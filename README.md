# LGU-Chat

A real-time chat application built with Next.js, Socket.io, and SQLite for Local Government Units (LGU).

> **Beta Version Notice**: This is a beta version. Your messages, files, and account data may be removed during major updates. Please backup important information regularly.

## Docker Deployment (Recommended)

LGU-Chat is designed to run as part of a multi-service Docker stack alongside LGU-SSO and LGU-SSO-UI. The Docker Compose setup lives in the parent directory and includes:

| Service | Domain | Description |
|---------|--------|-------------|
| **lgu-chat** | `chat.lguquezon.local` | This app (Next.js + Express + Socket.io) |
| **lgu-sso** | `sso.lguquezon.local` | SSO API (Laravel) |
| **lgu-sso-ui** | `sso-ui.lguquezon.local` | SSO frontend (Next.js) |
| **nginx** | - | Reverse proxy (port 80) |
| **dns** | - | dnsmasq server (port 53) |
| **mysql** | - | MySQL 8.0 database |

### Prerequisites

- Docker and Docker Compose
- Stop any local web server using port 80 (e.g., `valet stop`)

### Quick Start

From the parent directory (`development/`):

```bash
# Build and start all services
docker compose build
docker compose up -d
```

The app will be available at `http://chat.lguquezon.local`.

### LAN Access (Other Devices)

A dnsmasq container runs on port 53 and resolves all `*.lguquezon.local` domains to the host machine's LAN IP. To access from other devices on the network:

1. Find the host machine's LAN IP (configured in `dns/dnsmasq.conf`)
2. On the client device, set the DNS server to the host's LAN IP
3. Visit `http://chat.lguquezon.local` -- no port number or `/etc/hosts` editing needed

### Environment Variables

Environment variables are defined in the parent `../.env` file and passed through `docker-compose.yml`. Key variables for lgu-chat:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SSO_LOGIN_URL` | SSO UI login page URL (baked at build time) |
| `NEXT_PUBLIC_SSO_CLIENT_ID` | SSO OAuth client ID (baked at build time) |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL (baked at build time) |
| `SSO_REDIRECT_URI` | OAuth callback URL |
| `SSO_API_URL` | Internal Docker network URL for SSO API |
| `ALLOWED_ORIGINS` | CORS allowed origins |

> `NEXT_PUBLIC_*` variables are embedded during `next build`. If you change them, you must rebuild: `docker compose build lgu-chat`

### Rebuilding

```bash
# Rebuild after changing NEXT_PUBLIC_* env vars or source code
docker compose build lgu-chat

# Restart
docker compose up -d lgu-chat
```

---

## Local Development

For standalone development without Docker:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Initialize database**
   ```bash
   npm run init-db
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the app**
   - Local: `http://localhost:3000`
   - Network: `http://YOUR_IP:3000`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run init-db` | Initialize the database |
| `npm run fresh-db` | Reset database (fresh start) |

---

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Backend**: Express.js with Socket.io
- **Database**: SQLite with custom ORM
- **Authentication**: SSO via LGU-SSO (OAuth flow)
- **File Storage**: Local filesystem
- **UI**: Tailwind CSS with Radix UI components

## Features

- Real-time messaging with Socket.io
- File sharing and uploads
- Group conversations
- User management and admin panel
- Desktop notifications
- Mobile responsive design
- Dark/light theme support
- SSO authentication via LGU-SSO

---

**LGU-Chat** - Developed by Management Information System Section (MISS)
Municipality Of Quezon Bukidnon 8715 Philippines
All Rights Reserved 2025
