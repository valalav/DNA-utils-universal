module.exports = {
  apps: [{
    name: "ftdna-haplo-app",
    script: "./server/server.js",
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
      PORT: 9003,
      API_PATH: "/api",
      // Разрешаем запросы от str-matcher (порт 9002) и Vite (5173)
      ALLOWED_ORIGINS: "http://localhost:9002,http://127.0.0.1:9002,http://localhost:5173,http://127.0.0.1:5173"
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G'
  }]
};