module.exports = {
  apps: [{
    name: "ftdna-haplo-app",
    script: "./server/server.js",
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
      PORT: 9003,
      API_PATH: "/api",
      ALLOWED_ORIGINS: "http://localhost:9002,http://127.0.0.1:9002,http://localhost:5173,http://127.0.0.1:5173"
    },

    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: '2G'
  }]
};
