import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  eslint: {
    // Linting is run separately via `pnpm lint`; don't block builds on it.
    ignoreDuringBuilds: true,
  },
  // Keeps webpack from bundling the Workers-only generated Prisma client
  // (node_modules/prisma-workers-client, see prisma/schema.prisma's
  // `clientWorkers` generator) — that package's own `.wasm` query-compiler
  // import needs to reach OpenNext's later esbuild pass unresolved so it gets
  // handled there instead of mis-bundled into a filesystem-loaded chunk that
  // doesn't work inside workerd (no real filesystem). src/lib/prisma.ts is
  // the only importer.
  serverExternalPackages: ["prisma-workers-client"],
};

// Cloudflare Workers deployment (OpenNext adapter). This makes
// `getCloudflareContext()` (src/lib/prisma.ts) resolve local `wrangler dev`
// bindings (from wrangler.jsonc + .dev.vars) when running the plain `next dev`
// server too, per the official OpenNext Cloudflare setup guide. It's a no-op
// for anything not actually running under workerd — local dev/E2E keep using
// the standard Prisma client (see src/lib/prisma.ts's runtime check), so this
// does not change local dev/E2E behavior.
initOpenNextCloudflareForDev();

export default nextConfig;
