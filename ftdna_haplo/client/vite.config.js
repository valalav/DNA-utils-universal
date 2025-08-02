import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'os'

// Функция для автоматического определения внешнего IP
function getExternalIP() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Пропускаем loopback и non-IPv4 адреса
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // fallback
}

const HOST_IP = process.env.VITE_API_URL ?
  process.env.VITE_API_URL :
  `http://${getExternalIP()}:9003`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: HOST_IP,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        secure: false,
        configure: (proxy, options) => {
          console.log(`🔗 Vite proxy настроен на: ${HOST_IP}`);
        }
      }
    }
  }
})