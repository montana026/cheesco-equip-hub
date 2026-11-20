import type { NextConfig } from "next";
import { assertProductionEnv, isRealProduction } from './lib/startup-check';
import { withSentryConfig } from '@sentry/nextjs/config';

// Validate environment at build/start time for real production deployments.
// Safe to call here: assertProductionEnv() is a no-op unless isRealProduction() is true.
assertProductionEnv();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'vmnszggrtvzspquwcrjt.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin/operations/rentals/:id',
        destination: '/admin/operations?requestId=:id',
        permanent: false,
      },
      {
        source: '/admin/operations/requests/:id',
        destination: '/admin/operations?requestId=:id',
        permanent: false,
      },
      {
        source: '/dashboard/customer/requests/:id',
        destination: '/dashboard/customer?requestId=:id',
        permanent: false,
      },
      {
        source: '/dashboard/customer/rentals/:id',
        destination: '/dashboard/customer?requestId=:id',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          ...(isRealProduction()
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
