/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  images: {
    domains: ['api.qrserver.com', 'stellar.expert'],
    formats: ['image/webp', 'image/avif'],
  },
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;