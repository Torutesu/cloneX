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
 */
export async function ingestEmail(workspaceId: string, input: IngestEmailInput) {
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
