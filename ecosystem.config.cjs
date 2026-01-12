// PM2 Ecosystem Configuration
// Use with: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [{
    name: 'catsky-club',
    script: 'server.js',
    cwd: process.cwd(),
    instances: 1,
    exec_mode: 'fork',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      VITE_GHOST_URL: 'https://catsky.club',
      VITE_GHOST_CONTENT_API_KEY: 'f6dd5a28bd25bdc6e849457dd2'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10
  }]
}
