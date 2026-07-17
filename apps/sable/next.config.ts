import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Linting is run separately via `pnpm lint`; don't block builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
