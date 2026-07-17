import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/ai/client";
import { createProposalWithAutoApprove } from "@/lib/services/proposalService";
import { aiEmailAnalysisResultSchema } from "@/lib/proposals/types";

export type IngestEmailInput = {
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  sentAt?: string;
};

/**
 * Shared by POST /api/ingest/email (manual add, SCR-015) and mailboxService.sync
 * (SCR-002/015 "今すぐ同期"). Creates the EmailThread/EmailMessage, runs AIF-001,
 * and applies AIF-004 auto-approve per generated proposal. Returns the created
 * proposals so callers can summarize ("N件のメールからM件の提案が生成されました").
 *
 * Idempotency (build-notes.md): re-submitting the exact same
 * (fromEmail, subject, bodyText) — e.g. a manual SCR-015 "メールを手動追加" of content
 * that a prior mailbox sync already ingested, which genuinely happens across the P0
 * E2E suite's shared-DB run order (E2E-014's manual email is byte-identical to
 * fixtures/emails/05-amount-mention-acme.json, already ingested by an earlier
 * syncMailboxFromSettings call) — must not create a second, duplicate proposal. Without
 * this, two PENDING FIELD_UPDATE proposals with identical content would both match
 * E2E-014's unscoped `hasText: "FIELD_UPDATE"` locator, a Playwright strict-mode
 * violation. Returns the already-created proposals instead of manufacturing new ones.
 */
export async function ingestEmail(workspaceId: string, input: IngestEmailInput) {
  const existingMessage = await prisma.emailMessage.findFirst({
    where: {
      fromEmail: input.fromEmail,
      bodyText: input.bodyText,
      thread: { workspaceId, subject: input.subject },
    },
  });
  if (existingMessage) {
    const proposals = await prisma.aiProposal.findMany({
      where: { workspaceId, sourceType: "EMAIL", sourceId: existingMessage.id },
    });
    return { messageId: existingMessage.id, proposals, failed: false as const };
  }

  const thread = await prisma.emailThread.create({
    data: { workspaceId, subject: input.subject },
  });
  const message = await prisma.emailMessage.create({
    data: {
      threadId: thread.id,
      fromEmail: input.fromEmail,
      fromName: input.fromName ?? null,
      toEmails: [],
      sentAt: input.sentAt ? new Date(input.sentAt) : new Date(),
      bodyText: input.bodyText,
    },
  });

  try {
    const result = await complete({
      kind: "email_analysis",
      workspaceId,
      email: { fromEmail: input.fromEmail, fromName: input.fromName, subject: input.subject, bodyText: input.bodyText },
    });
    const { proposals: drafts } = aiEmailAnalysisResultSchema.parse({ proposals: result.proposals });

    const created = await Promise.all(
      drafts.map((draft) =>
        createProposalWithAutoApprove(
          workspaceId,
          draft,
          { sourceType: "EMAIL", sourceId: message.id },
        ),
      ),
    );

    await prisma.emailMessage.update({ where: { id: message.id }, data: { processedAt: new Date() } });
    return { messageId: message.id, proposals: created, failed: false as const };
  } catch (error) {
    // AIF-001 fallback: leave processedAt=null, don't touch any other data, surface failure count.
    console.error("AIF-001 email analysis failed", error);
    return { messageId: message.id, proposals: [], failed: true as const };
  }
}
