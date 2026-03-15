module.exports = {
  apps: [
    {
      name: "ai-recruitment-app",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: process.cwd(),
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      autorestart: true,
      watch: false,
    },
  ],
};
