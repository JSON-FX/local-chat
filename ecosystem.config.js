module.exports = {
  apps: [{
    name: 'lgu-chat',
    script: 'server.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    cwd: '/var/www/html/local-chat',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/lgu-chat/error.log',
    out_file: '/var/log/lgu-chat/out.log',
    log_file: '/var/log/lgu-chat/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000
  }]
};
