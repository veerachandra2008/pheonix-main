import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  allowedDevOrigins: [
    'preview-chat-7f82c6a7-f15f-47db-8793-4c4d739de87b.space-z.ai',
    '.space-z.ai',
    '.space.chatglm.site',
  ],
  async headers() {
    return [
      {
        source: '/:all*(mp4|webm|jpg|jpeg|png|webp|svg|ico|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const rawUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || process.env.FLASK_API_URL || 'https://pheonix-main.onrender.com';
    const cleanUrl = rawUrl.trim();
    const targetUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl.replace(/\/$/, '')}/api`;

    return [
      {
        source: '/api/payments/:path*',
        destination: `${targetUrl}/payments/:path*`,
      },
      {
        source: '/api/auth/profile',
        destination: `${targetUrl}/auth/profile`,
      },
      {
        source: '/api/auth/user/:path*',
        destination: `${targetUrl}/auth/user/:path*`,
      },
      {
        source: '/api/auth/follow',
        destination: `${targetUrl}/auth/follow`,
      },
      {
        source: '/api/auth/following/:path*',
        destination: `${targetUrl}/auth/following/:path*`,
      },
      {
        source: '/api/auth/following',
        destination: `${targetUrl}/auth/following`,
      },
      {
        source: '/api/auth/update-role',
        destination: `${targetUrl}/auth/update-role`,
      },
      {
        source: '/api/auth/users/role',
        destination: `${targetUrl}/auth/users/role`,
      },
      {
        source: '/api/attendance/:path*',
        destination: `${targetUrl}/attendance/:path*`,
      },
      {
        source: '/api/attendance',
        destination: `${targetUrl}/attendance`,
      },
      {
        source: '/api/rosters/:path*',
        destination: `${targetUrl}/rosters/:path*`,
      },
      {
        source: '/api/rosters',
        destination: `${targetUrl}/rosters`,
      },
      {
        source: '/api/notifications/:path*',
        destination: `${targetUrl}/notifications/:path*`,
      },
      {
        source: '/api/notifications',
        destination: `${targetUrl}/notifications`,
      },
      {
        source: '/api/applications/:path*',
        destination: `${targetUrl}/applications/:path*`,
      },
      {
        source: '/api/applications',
        destination: `${targetUrl}/applications`,
      },
      {
        source: '/api/teams/:path*',
        destination: `${targetUrl}/teams/:path*`,
      },
      {
        source: '/api/teams',
        destination: `${targetUrl}/teams`,
      },
      {
        source: '/api/colleges/:path*',
        destination: `${targetUrl}/colleges/:path*`,
      },
      {
        source: '/api/colleges',
        destination: `${targetUrl}/colleges`,
      },
      {
        source: '/api/tournaments/register',
        destination: `${targetUrl}/tournaments/register`,
      },
      {
        source: '/api/registrations/:path*',
        destination: `${targetUrl}/registrations/:path*`,
      },
      {
        source: '/api/registrations',
        destination: `${targetUrl}/registrations`,
      },
    ];
  },
};

export default nextConfig;
