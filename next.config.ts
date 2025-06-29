import type { NextConfig } from "next";
import { networkInterfaces } from 'os';

// Get allowed origins for development
const getAllowedOrigins = () => {
  const origins: string[] = [];
  
  if (process.env.NODE_ENV === 'development') {
    origins.push('localhost:3000', '127.0.0.1:3000');
    
    // Add auto-detected network IPs
    const networks = networkInterfaces();
    Object.keys(networks).forEach(name => {
      networks[name]?.forEach(net => {
        // Skip internal/loopback and non-IPv4 addresses
        if (!net.internal && net.family === 'IPv4') {
          origins.push(`${net.address}:3000`);
        }
      });
    });
    
    // Add custom IPs from environment variable
    const customIPs = process.env.CUSTOM_ALLOWED_IPS;
    if (customIPs) {
      const additionalIPs = customIPs.split(',').map(ip => `${ip.trim()}:3000`);
      origins.push(...additionalIPs);
    }
  } else {
    // Production origins
    const domainName = process.env.DOMAIN_NAME || 'chat.lguquezon.local';
    origins.push(domainName);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins) {
      origins.push(...allowedOrigins.split(',').map(origin => origin.trim().replace(/^https?:\/\//, '')));
    }
  }
  
  return origins;
};

const nextConfig: NextConfig = {
  // Allow origins for network access
  allowedDevOrigins: getAllowedOrigins(),
  
  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Disable TypeScript strict checking during build
  typescript: {
    ignoreBuildErrors: true
  },

  serverExternalPackages: ['sqlite3'],

  // Ensure socket.io and static files are handled properly
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket/:path*',
      },
    ];
  },

  // Add proper headers for socket.io and API routes
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const allowedOrigin = isDev ? '*' : (process.env.ALLOWED_ORIGINS || 'http://chat.lguquezon.local');
    
    return [
      {
        source: '/socket.io/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigin,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigin,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
