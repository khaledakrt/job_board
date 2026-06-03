/** PM2 — lancer depuis la racine du repo : pm2 start deploy/pm2.ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'jobboard-api',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
    },
  ],
};
