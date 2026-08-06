module.exports = {
  apps: [
    {
      name: "nezal",
      cwd: "/home/nezalherbocare.com/current",
      script: "server.js",
      exec_mode: "cluster",
      instances: 2,
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
      },
      error_file: "/home/nezalherbocare.com/shared/logs/error.log",
      out_file: "/home/nezalherbocare.com/shared/logs/out.log",
      time: true,
    },
  ],
};