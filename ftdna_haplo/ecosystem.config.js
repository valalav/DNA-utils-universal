module.exports = {
  apps: [{
    name: "ftdna-haplo-app",
    script: "./server/server.js",
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
      PORT: 9003,
      API_PATH: "/api",
      // Укажите здесь домен, с которого будет доступен клиент в продакшене
      // Например: "https://your-domain.com"
      // Можно указать несколько через запятую: "https://domain1.com,https://domain2.com"
      ALLOWED_ORIGINS: "" 
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};