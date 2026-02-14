module.exports = {
  apps: [
    {
      name: "discreen",
      script: "dist/index.js",
      node_args: "--max-old-space-size=512",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      max_memory_restart: "500M",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
