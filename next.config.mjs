/** @type {import('next').NextConfig} */

const BACKEND_URL =
  process.env.API_INTERNAL_BASE_URL || "http://localhost:4000";

const nextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  allowedDevOrigins: [
    "unusuriously-interlocutory-dann.ngrok-free.dev",
    "192.168.137.1",
    "192.168.0.15",
  ],

  async rewrites() {
    return [
      {
        // Browser calls /api/... (via NEXT_PUBLIC_API_BASE_URL=/api)
        // while Next.js pages keep /leads, /jobs, etc.
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
