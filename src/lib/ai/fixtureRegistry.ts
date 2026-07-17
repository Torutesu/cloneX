import { aiEmailAnalysisResultSchema, type AiProposalDraft } from "@/lib/proposals/types";

// Statically imported (not read from disk at request time) so this module has
// no `fs`/`process.cwd()` dependency and works unchanged under Cloudflare
// Workers, which has no filesystem. Every fixtures/emails/**/*.json file must
// be listed here explicitly — there's no directory-walk at runtime anymore,
// so a new fixture file needs a new import line below as well.
import fixture01 from "../../../fixtures/emails/01-new-lead-acme.json";
import fixture02 from "../../../fixtures/emails/02-new-lead-beta.json";
import fixture03 from "../../../fixtures/emails/03-reply-acme-task.json";
import fixture04 from "../../../fixtures/emails/04-reply-gamma-new-contact.json";
import fixture05 from "../../../fixtures/emails/05-amount-mention-acme.json";
import fixture06 from "../../../fixtures/emails/06-noise-newsletter.json";
import manual07 from "../../../fixtures/emails/manual/07-order-confirmed-high-confidence.json";
import manual08 from "../../../fixtures/emails/manual/08-order-confirmed-mid-confidence.json";
import manual09 from "../../../fixtures/emails/manual/09-mobile-review-task.json";

export type EmailFixture = {
  id: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  sentAt: string;
  expectedProposals: AiProposalDraft[];
};

/** The simulated mailbox pulled by `POST /api/integrations/mailbox/sync` — top-level fixtures/emails/*.json only. */
const MAILBOX_FIXTURES = [
  fixture01,
  fixture02,
  fixture03,
  fixture04,
  fixture05,
  fixture06,
] as unknown as EmailFixture[];

/** Presets only reachable via `POST /api/ingest/email` (SCR-015 "メールを手動追加") — fixtures/emails/manual/*.json. */
const MANUAL_FIXTURES = [manual07, manual08, manual09] as unknown as EmailFixture[];

const ALL_FIXTURES: EmailFixture[] = [...MAILBOX_FIXTURES, ...MANUAL_FIXTURES];

/** Every fixtures/emails/**\/*.json fixture (mailbox-sync set + fixtures/emails/manual/ presets). */
export function loadEmailFixtures(): EmailFixture[] {
  return ALL_FIXTURES;
}

/** Only the top-level fixtures/emails/*.json (not manual/) — these make up the simulated mailbox for sync. */
export function loadMailboxFixtures(): EmailFixture[] {
  return MAILBOX_FIXTURES;
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
