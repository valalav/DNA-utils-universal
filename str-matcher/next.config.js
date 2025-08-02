/** @type {import('next').NextConfig} */
const nextConfig = {
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

    // Workers are handled natively by Next.js with new URL() syntax
    // No need for worker-loader configuration

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
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003'}/api/:path*`,
      },
    ]
  }
};

module.exports = nextConfig;