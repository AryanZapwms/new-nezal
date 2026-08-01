module.exports = {
  apps: [
    {
      name: "nezal",

      // Always points at the "current" symlink (see deploy.yml) — this path
      // never changes between releases, only what it points to changes.
      cwd: "/home/nezalherbocare.com/current",

      // Point directly at the next binary rather than "npm start".
      // PM2 cluster mode needs to fork the actual Node process itself —
      // wrapping it in npm adds a shell layer in between that breaks
      // clean cluster forking/reload.
      script: "node_modules/.bin/next",
      args: "start --port 3005",

      // Cluster mode is required for `pm2 reload` (or startOrReload) to be
      // zero-downtime: PM2 cycles instances one at a time, always keeping
      // at least one alive. Your current fork-mode/1-instance setup can't
      // do this — restart always has a dead window.
      exec_mode: "cluster",
      instances: 2,

      // Wait for the new instance to actually be listening before PM2
      // considers it "up" and moves on to recycle the next one.
      listen_timeout: 10000,
      kill_timeout: 5000,

      max_memory_restart: "512M",


      
      env: {
        NODE_ENV: "production",
      },

      error_file: "/home/nezalherbocare.com/shared/logs/error.log",
      out_file: "/home/nezalherbocare.com/shared/logs/out.log",
      time: true,
    },
  ],
};