/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://ofo-api:8000';
    return [
      {
        source: '/api/py/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/api/settings/:path*',
        destination: `${backendUrl}/api/settings/:path*`,
      },
      {
        source: '/api/statements/:path*',
        destination: `${backendUrl}/api/statements/:path*`,
      },
      {
        source: '/api/market/:path*',
        destination: `${backendUrl}/api/market/:path*`,
      },
      {
        source: '/api/receipts/:path*',
        destination: `${backendUrl}/api/receipts/:path*`,
      },
    ];
  },
};

export default nextConfig;
