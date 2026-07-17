// OpenNext Cloudflare adapter config. No overrides (R2 incremental cache,
// KV/D1 tag cache, etc.) are wired up — the app has no ISR/`revalidate`
// usage today, so the default in-memory-per-isolate cache is sufficient.
// See https://opennext.js.org/cloudflare/caching if that changes.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
