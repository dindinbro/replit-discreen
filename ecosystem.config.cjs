module.exports = {
  apps: [
    {
      name: "discreen",
      script: "dist/index.mjs",
      node_args: "--max-old-space-size=512",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      max_memory_restart: "500M",
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: "bridge",
      script: "dist/bridge.mjs",
      node_args: "--max-old-space-size=4096",
      env: {
        NODE_ENV: "production",
        BRIDGE_PORT: "5050",
        DATA_DIR: "/srv/discreen/data",
      },
      max_memory_restart: "4G",
      restart_delay: 5000,
      max_restarts: 5,
    },
  ],
};
