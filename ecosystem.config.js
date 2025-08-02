require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const path = require('path');
const os = require('os');

// Автоматическое определение внешнего IP адреса
function getExternalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Пропускаем loopback и non-IPv4 адреса
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost'; // fallback
}

const HOST_IP = process.env.HOST_IP || getExternalIP();

module.exports = {
  apps: [
    {
      name: 'str-matcher-2',
      cwd: './str-matcher',
      script: './node_modules/next/dist/bin/next',
      args: 'dev -H 0.0.0.0',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        NEXT_PUBLIC_API_URL: process.env.DEV_API_URL || `http://${HOST_IP}:9003`,
        PORT: 9002
      }
    },
    {
      name: 'ftdna-haplo-2',
      cwd: path.resolve(__dirname, 'ftdna_haplo'),
      script: './server/server.js',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: 9003,
        HOST: '0.0.0.0',
        API_PATH: '/api',
        ALLOWED_ORIGINS: isProduction ?
          process.env.PROD_ALLOWED_ORIGINS :
          process.env.DEV_ALLOWED_ORIGINS || `http://${HOST_IP}:9002,http://${HOST_IP}:5173,http://localhost:9002,http://localhost:5173`
      },
      env_file: isProduction ? './.env.production' : './.env.development'
    },
    {
      name: 'haplo-client',
      cwd: './ftdna_haplo/client',
      script: './node_modules/vite/bin/vite.js',
      args: '--host 0.0.0.0',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: 5173,
        VITE_API_URL: isProduction ? '/api' : `http://${HOST_IP}:9003`
      },
      env_file: './.env.development'
    }
  ]
};