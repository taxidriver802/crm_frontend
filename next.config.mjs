/** @type {import('next').NextConfig} */

const BACKEND_URL = process.env.API_INTERNAL_BASE_URL || "http://localhost:4000";

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
    "192.168.0.6",
    "192.168.0.20",
    "172.22.32.228",
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

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        // Every page, but not /api/*: API responses keep the backend's own
        // helmet headers, which allow same-origin framing for file previews.
        // Scripts are not restricted here: Next and the theme bootstrap use
        // inline scripts, and a nonce-based policy is its own change.
        source: "/:path((?!api/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
