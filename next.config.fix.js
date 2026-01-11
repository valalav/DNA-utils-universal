/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (dev) {
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

  experimental: {},

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src']
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:9005/api';
    const haploUrl = process.env.HAPLO_API_URL || 'http://localhost:9003';

    return [
      // Backend API routes (profiles, databases, statistics, etc.)
      {
        source: '/api/profiles/:path*',
        destination: `${backendUrl}/profiles/:path*`,
      },
      {
        source: '/api/databases/:path*',
        destination: `${backendUrl}/databases/:path*`,
      },
      {
        source: '/api/statistics',
        destination: `${backendUrl}/statistics`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/admin/:path*`,
      },
      // Haplogroup service routes
      {
        source: '/api/check-subclade',
        destination: `${haploUrl}/api/check-subclade`,
      },
      {
        source: '/api/search/:path*',
        destination: `${haploUrl}/api/search/:path*`,
      },
      // Fallback for any other API routes to haplo service
      {
        source: '/api/:path*',
        destination: `${haploUrl}/api/:path*`,
      },
    ]
  }
};

module.exports = nextConfig;
