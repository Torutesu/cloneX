import { PrismaClient } from "@prisma/client";
// Bare specifier into node_modules (not the "@/" src alias) — see the
// `clientWorkers` generator comment in prisma/schema.prisma and this file's
// `serverExternalPackages` entry in next.config.ts for why this generated
// client's `output` lives directly under node_modules/ under that exact name:
// it makes Next's webpack build leave this import unbundled for the server
// bundle, so its internal `import('./query_compiler_bg.wasm')` reaches
// OpenNext's later esbuild pass untouched and gets resolved there against the
// `conditions: ["workerd"]` it sets, instead of webpack mis-bundling the wasm
// file into an fs-loaded chunk (which doesn't work inside workerd).
import { PrismaClient as WorkersPrismaClient } from "prisma-workers-client/wasm";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * True only when actually executing inside workerd (Cloudflare Workers/Wrangler),
 * never during local `next dev`/`next build`/E2E — even though `next.config.ts`'s
 * `initOpenNextCloudflareForDev()` makes `getCloudflareContext()` resolvable there
 * too. `navigator.userAgent === "Cloudflare-Workers"` is the runtime-detection
 * method documented by Cloudflare/OpenNext for exactly this "which engine am I
 * really running under" question.
 */
function isWorkersRuntime(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

/**
 * Local Node path (unchanged from before the Workers migration): the classic
 * engine-based `@prisma/client` generated client, DATABASE_URL from the env.
 */
function createNodePrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Workers path: workerd can't load the classic engine binary, so this uses the
 * second, fully engine-less client generated from `prisma/schema.prisma`'s
 * `clientWorkers` generator (`node_modules/prisma-workers-client`, `engineType
 * = "client"`) via the `@prisma/adapter-pg` driver adapter, pointed at the
 * Hyperdrive binding's connection string (wrangler.jsonc's `hyperdrive[0]`, or
 * its `localConnectionString` under `wrangler dev`/`cf:preview`).
 * `getCloudflareContext()` (sync form) is only safe to call once request
 * handling is underway, which is guaranteed here since nothing in this module
 * calls it at import time — only lazily, from the getter below.
 */
function createWorkersPrismaClient(): PrismaClient {
  const { env } = getCloudflareContext();
  const hyperdrive = env.HYPERDRIVE;
  if (!hyperdrive) {
    throw new Error(
      "HYPERDRIVE binding not found in Cloudflare env — check the `hyperdrive` block in wrangler.jsonc",
    );
  }
  // `max: 1` — this client is scoped to a single request (see
  // workersClientsByContext below), so it never needs more than one
  // connection at a time; Hyperdrive itself is what provides real pooling
  // upstream of this binding.
  const adapter = new PrismaPg({ connectionString: hyperdrive.connectionString, max: 1 });
  // Cast: this is a different generated class (node_modules/prisma-workers-client)
  // than the local Node `@prisma/client` import above, but both are generated
  // from the same schema.prisma so their model API surface is identical —
  // only the query engine underneath differs. Typing this function's return as
  // the local client's type (rather than a union of the two full generated
  // classes' huge generic signatures) is what keeps getPrismaClient()'s
  // ternary below from blowing up the type checker with "Type instantiation is
  // excessively deep".
  return new WorkersPrismaClient({ adapter }) as unknown as PrismaClient;
}

// Keyed by each request's Cloudflare `ExecutionContext` (`getCloudflareContext().ctx`,
// a distinct object per request) so a Workers Prisma client is created at most
// once per request, then garbage-collected with it — never reused across two
// different requests. That "never across requests" part isn't just tidiness:
// reusing one adapter client/connection for a query in a *second* request
// reproducibly hung every subsequent request under `wrangler dev`'s local
// Hyperdrive-over-Postgres emulation (confirmed by testing — the same query
// that succeeded once would hang forever the next time round on a reused
// client). Scoping to the request's ExecutionContext avoids that while still
// sharing one client across the several prisma.* calls a single request makes
// (e.g. dealService.getBoard()'s per-stage Promise.all).
const workersClientsByContext = new WeakMap<object, PrismaClient>();

function getPrismaClient(): PrismaClient {
  if (isWorkersRuntime()) {
    const { ctx } = getCloudflareContext();
    const cached = workersClientsByContext.get(ctx);
    if (cached) return cached;
    const client = createWorkersPrismaClient();
    workersClientsByContext.set(ctx, client);
    return client;
  }
  if (global.__prisma) return global.__prisma;
  const client = createNodePrismaClient();
  // Long-standing dev-server hot-reload guard (local Node only).
  global.__prisma = client;
  return client;
}

/**
 * Lazily resolves to the right client on first property access (never at module
 * load), so import order never matters and nothing runs `getCloudflareContext()`
 * before a request is actually being handled. Every service file keeps importing
 * this the same way it always did: `import { prisma } from "@/lib/prisma"`. Both
 * generated clients share the same model API surface (same schema), so this
 * type-checks as the local Node client and behaves identically on Workers.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
