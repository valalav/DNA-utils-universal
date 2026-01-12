/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Optimize file watching to prevent unnecessary restarts
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Reduce file watching overhead
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/coverage/**',
          '**/dist/**',
          '**/build/**',
          '**/*.log',
          '**/*.csv',
          '**/tmp/**',
          '**/temp/**',
          '**/*.backup',
          '**/*.bak',
          '**/*.old'
        ]
      };
    }

    return config;
  },

  // Disable experimental features that might cause instability
  experimental: {
    // workerThreads: false,
    // webpackBuildWorker: false
  },

  // Optimize TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize ESLint
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src']
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Эта настройка проксирует запросы к вашему haplo-серверу.
        // Установите переменную окружения HAPLO_API_URL, чтобы указать на ваш API.
        // Например: HAPLO_API_URL=http://192.168.10.187:9003
        destination: `${process.env.BACKEND_API_URL || 'http://192.168.10.170:9005'}/api/:path*`,
      },
    ]
  }
};

module.exports = nextConfig;