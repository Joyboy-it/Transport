import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@prisma/client", "pg", "bcryptjs"],
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  redirects() {
    return [
      { source: "/jobs/:path*", destination: "/transport/jobs/:path*", permanent: false },
      { source: "/queues/:path*", destination: "/transport/queues/:path*", permanent: false },
      { source: "/masters/:path*", destination: "/transport/masters/:path*", permanent: false },
      { source: "/settings/users/:path*", destination: "/admin/users/:path*", permanent: false },
      { source: "/settings", destination: "/transport/settings", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
