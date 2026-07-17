import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { aiEmailAnalysisResultSchema, type AiProposalDraft } from "@/lib/proposals/types";

export type EmailFixture = {
  id: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  sentAt: string;
  expectedProposals: AiProposalDraft[];
};

const FIXTURES_ROOT = path.join(process.cwd(), "fixtures", "emails");

function walk(dir: string): string[] {
  let results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full));
    } else if (entry.name.endsWith(".json")) {
      results.push(full);
    }
  }
  return results;
}

let cache: EmailFixture[] | null = null;

/** Loads every fixtures/emails/**\/*.json fixture (mailbox-sync set + fixtures/emails/manual/ presets). Cached after first read. */
export function loadEmailFixtures(): EmailFixture[] {
  if (cache) return cache;
  const files = walk(FIXTURES_ROOT);
  cache = files.map((file) => JSON.parse(readFileSync(file, "utf8")) as EmailFixture);
  return cache;
}

/** Only the top-level fixtures/emails/*.json (not manual/) — these make up the simulated mailbox for sync. */
export function loadMailboxFixtures(): EmailFixture[] {
  const files = readdirSync(FIXTURES_ROOT, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(FIXTURES_ROOT, e.name));
  return files.map((file) => JSON.parse(readFileSync(file, "utf8")) as EmailFixture);
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Exact-content match on (fromEmail, subject, bodyText) — deterministic and collision-safe even when subjects repeat (E2E-013). */
export function matchEmailFixture(email: {
  fromEmail: string;
  subject: string;
  bodyText: string;
}): EmailFixture | null {
  const fixtures = loadEmailFixtures();
  const found = fixtures.find(
    (f) =>
      f.fromEmail.toLowerCase() === email.fromEmail.toLowerCase() &&
      normalize(f.subject) === normalize(email.subject) &&
      normalize(f.bodyText) === normalize(email.bodyText),
  );
  return found ?? null;
}

export function assertValidFixtures(): void {
  for (const fixture of loadEmailFixtures()) {
    aiEmailAnalysisResultSchema.parse({ proposals: fixture.expectedProposals });
  }
}
