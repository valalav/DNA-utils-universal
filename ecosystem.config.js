module.exports = {
  apps: [
    // Backend API (Express) - порт 9005
    {
      name: "backend",
      cwd: "./backend",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 9005,
        DB_MAX_CONNECTIONS: 3, // 3 conn * 32 workers = 96 (fits in PG default 100)
        MASTER_API_KEY: "dna_v2_universal_secret_key_2026"
      }
    },
    // FTDNA Haplogroup Service - порт 9003
    {
      name: "ftdna-haplo-app",
      cwd: "./ftdna_haplo",
      script: "./server/server.js",
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 9003,
        API_PATH: "/api",
        ALLOWED_ORIGINS: "https://pystr.valalav.ru"
      }
    },
    // Next.js Frontend - порт 3000 (nginx проксирует сюда)
    // ВАЖНО: используем standalone build (output: 'standalone' в next.config.js)
    {
      name: "str-matcher-app",
      cwd: "./str-matcher",
      script: "./.next/standalone/server.js",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        HAPLO_API_URL: "http://127.0.0.1:9003",
        BACKEND_API_URL: "http://192.168.10.170:9005"
      }
    }
  ]
};