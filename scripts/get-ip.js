#!/usr/bin/env node

const { networkInterfaces } = require('os');

console.log('🌐 Network IP Detection for LGU-Chat\n');

const networks = networkInterfaces();
const networkIPs = [];

Object.keys(networks).forEach(name => {
  networks[name]?.forEach(net => {
    if (!net.internal && net.family === 'IPv4') {
      networkIPs.push({
        interface: name,
        address: net.address,
        url: `http://${net.address}:3000`
      });
    }
  });
});

if (networkIPs.length === 0) {
  console.log('❌ No external network interfaces found');
  console.log('💡 Make sure you\'re connected to a network');
} else {
  console.log('✅ Available network interfaces:');
  networkIPs.forEach((net, index) => {
    console.log(`${index + 1}. ${net.interface}: ${net.address}`);
    console.log(`   Access URL: ${net.url}`);
  });
  
  console.log('\n📋 To add custom IPs for multiple environments:');
  console.log('Create a .env.local file with:');
  console.log(`CUSTOM_ALLOWED_IPS=${networkIPs.map(n => n.address).join(',')}`);
}

console.log('\n🚀 Start the server with: npm run dev'); 