import { prisma } from "@/lib/prisma";
import { loadMailboxFixtures } from "@/lib/ai/fixtureRegistry";
import { ingestEmail } from "@/lib/services/emailIngestService";

type SyncJobState = {
  workspaceId: string;
  state: "running" | "done";
  ingested: number;
  proposalsCreated: number;
  failed: number;
};

// Fixture-mode sync completes synchronously (no real network calls), so there is no
// actual background job to track. The jobId is a self-describing base64url token
// carrying its own completed result, rather than a key into shared process memory —
// Next.js dev can serve different API routes from different module instances, so an
// in-memory Map keyed by jobId is NOT reliably shared across the POST /sync and
// GET /status requests. This keeps the spec's {jobId} / poll-by-jobId API shape
// while staying correct across processes (and multi-instance deploys later).
function encodeJob(state: SyncJobState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function decodeJob(jobId: string): SyncJobState | null {
  try {
    return JSON.parse(Buffer.from(jobId, "base64url").toString("utf8")) as SyncJobState;
  } catch {
    return null;
  }
}

export async function connectMailbox(_workspaceId: string) {
  return { status: "connected" as const };
}

async function alreadyIngested(workspaceId: string, fromEmail: string, subject: string, bodyText: string) {
  const existing = await prisma.emailMessage.findFirst({
    where: {
      fromEmail,
      bodyText,
      thread: { workspaceId, subject },
    },
  });
  return !!existing;
}

export async function syncMailbox(workspaceId: string): Promise<{ jobId: string }> {
  const fixtures = loadMailboxFixtures();

  let ingested = 0;
  let proposalsCreated = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    if (await alreadyIngested(workspaceId, fixture.fromEmail, fixture.subject, fixture.bodyText)) {
      continue;
    }
    const result = await ingestEmail(workspaceId, {
      fromEmail: fixture.fromEmail,
      fromName: fixture.fromName,
      subject: fixture.subject,
      bodyText: fixture.bodyText,
      sentAt: fixture.sentAt,
    });
    ingested += 1;
    proposalsCreated += result.proposals.length;
    if (result.failed) failed += 1;
  }

  const jobId = encodeJob({ workspaceId, state: "done", ingested, proposalsCreated, failed });
  return { jobId };
}

export function getSyncStatus(workspaceId: string, jobId: string) {
  const job = decodeJob(jobId);
  if (!job || job.workspaceId !== workspaceId) return null;
  const { state, ingested, proposalsCreated, failed } = job;
  return { state, ingested, proposalsCreated, failed };
}
