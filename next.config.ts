import type { NextConfig } from "next";
import { networkInterfaces } from 'os';

// Get current network IP addresses + custom IPs from environment
const getLocalIPs = () => {
  const ips = ['localhost:3000', '127.0.0.1:3000'];
  
  // Add auto-detected network IPs
  const networks = networkInterfaces();
  Object.keys(networks).forEach(name => {
    networks[name]?.forEach(net => {
      // Skip internal/loopback and non-IPv4 addresses
      if (!net.internal && net.family === 'IPv4') {
        ips.push(`${net.address}:3000`);
      }
    });
  });
  
  // Add custom IPs from environment variable
  const customIPs = process.env.CUSTOM_ALLOWED_IPS;
  if (customIPs) {
    const additionalIPs = customIPs.split(',').map(ip => `${ip.trim()}:3000`);
    ips.push(...additionalIPs);
  }
  
  return ips;
};

const nextConfig: NextConfig = {
  // Allow dev origins for network access
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: getLocalIPs()
  }),
  
  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Disable TypeScript strict checking during build
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
