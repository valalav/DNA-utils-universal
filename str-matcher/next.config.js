/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   workerThreads: true,
  //   webpackBuildWorker: true
  // },
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