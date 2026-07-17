// Extends the OpenNext-provided `CloudflareEnv` (see
// node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.d.ts) with
// this app's own bindings/vars so `getCloudflareContext().env` is typed in
// src/lib/prisma.ts. Kept hand-written (rather than `wrangler types`-generated)
// since it only needs to add one binding on top of OpenNext's defaults.
declare global {
  interface CloudflareEnv {
    HYPERDRIVE: Hyperdrive;
    AI_MODE?: string;
    SESSION_SECRET?: string;
    ANTHROPIC_API_KEY?: string;
    AI_MODEL_MID?: string;
    AI_MODEL_HIGH?: string;
  }
}

export {};
