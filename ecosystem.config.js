const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envConfig = dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'lgu-chat',
    script: 'npm',
    args: 'run start',
    cwd: '/var/www/html/local-chat',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      ...envConfig.parsed // Spread all env variables
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
