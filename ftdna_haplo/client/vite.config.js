import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Разрешает доступ с других устройств в сети
    proxy: {
      // Проксирование запросов /api к вашему Express-серверу
      '/api': {
        target: 'http://localhost:9003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});