// c:\projects\DNA-utils-universal\ecosystem.config.js
require('dotenv').config();
const isProduction = process.env.NODE_ENV === 'production';
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'str-matcher-2',
      cwd: './str-matcher',
      script: './node_modules/next/dist/bin/next',
      args: 'dev',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        NEXT_PUBLIC_API_URL: 'http://localhost:9003/api',
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
        API_PATH: '/api',
        ALLOWED_ORIGINS: isProduction ? 
          process.env.PROD_ALLOWED_ORIGINS : 
          'http://localhost:9002,http://localhost:5173,http://localhost:9004'
      }
    },
    {
      name: 'haplo-client',
      cwd: './ftdna_haplo/client',
      script: './node_modules/vite/bin/vite.js',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: 5173,
        VITE_API_URL: isProduction ? '/api' : 'http://localhost:9003/api'
      }
    },
    {
      name: 'ystr-predictor',
      cwd: './ystr_predictor',
      script: './venv/Scripts/python.exe',
      args: '-m uvicorn app:app --host 0.0.0.0 --port 9004 --reload',
      env: {
        PYTHONPATH: '.',
        FTDNA_API_URL: 'http://localhost:9003/api'
      }
    }
  ]
};