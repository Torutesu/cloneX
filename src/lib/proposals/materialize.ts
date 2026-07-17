import type { Prisma, AiProposal } from "@prisma/client";
import { Errors } from "@/lib/api/errors";
import { resolveStageByName } from "@/lib/services/pipelineService";
import { findOrCreateCompanyForProposal, findOrCreateCompanyByName } from "@/lib/services/companyService";
import { findOrCreateContactForProposal } from "@/lib/services/contactService";
import { recordActivity } from "@/lib/services/activityService";
import {
  validateProposalPayload,
  type NewDealPayload,
  type NewContactPayload,
  type FieldUpdatePayload,
  type DraftEmailPayload,
  type TaskPayload,
} from "@/lib/proposals/types";

export type MaterializeResult = {
  dealId?: string;
  contactId?: string;
  taskId?: string;
};

/**
 * Implements the "承認時の実体化ルール" table from spec/01-screens/SCR-010-review.md,
 * shared by manual approval (POST /api/proposals/:id/approve) and AIF-004 auto-approve.
 * Must run inside the same transaction that flips the AiProposal status, so a failure
 * rolls the proposal back to PENDING (per AIF-004 fallback rule) instead of half-applying.
 */
export async function materializeProposal(
  tx: Prisma.TransactionClient,
  proposal: Pick<AiProposal, "id" | "type" | "workspaceId" | "sourceType" | "sourceId" | "payload">,
  payloadOverride?: unknown,
): Promise<MaterializeResult> {
  const rawPayload = payloadOverride ?? proposal.payload;
  const workspaceId = proposal.workspaceId;

  switch (proposal.type) {
    case "NEW_DEAL": {
      const payload = validateProposalPayload("NEW_DEAL", rawPayload) as NewDealPayload;
      const company = await findOrCreateCompanyForProposal(tx, workspaceId, {
        name: payload.companyName,
        domain: payload.companyDomain ?? null,
      });
      const contacts = await Promise.all(
        payload.contacts.map((c) =>
          findOrCreateContactForProposal(tx, workspaceId, {
            name: c.name,
            email: c.email,
            title: c.title,
            companyId: company.id,
          }),
        ),
      );
      const stage = await resolveStageByName(workspaceId, payload.stageName);
      const pipeline = await tx.pipeline.findFirst({ where: { workspaceId, isDefault: true } });
      if (!pipeline) throw Errors.internal("デフォルトパイプラインが見つかりません");

      const deal = await tx.deal.create({
        data: {
          workspaceId,
          pipelineId: pipeline.id,
          stageId: stage.id,
          name: payload.name,
          amount: payload.amount ?? null,
          currency: payload.currency ?? "USD",
          companyId: company.id,
          contacts: {
            create: payload.contacts.map((c, i) => ({ contactId: contacts[i]!.id, role: c.role ?? null })),
          },
        },
      });

      let taskId: string | undefined;
      if (payload.taskTitle) {
        const task = await tx.task.create({
          data: { workspaceId, dealId: deal.id, title: payload.taskTitle, source: "AI" },
        });
        taskId = task.id;
        await recordActivity(tx, {
          workspaceId,
          dealId: deal.id,
          type: "TASK",
          summary: `AI提案タスク: ${payload.taskTitle}`,
          refId: task.id,
        });
      }

      await recordActivity(tx, {
        workspaceId,
        dealId: deal.id,
        type: "SYSTEM",
        summary: "AIがディールを作成",
        refId: proposal.id,
      });
      if (proposal.sourceType === "EMAIL" && proposal.sourceId) {
        const email = await tx.emailMessage.findUnique({ where: { id: proposal.sourceId } });
        await recordActivity(tx, {
          workspaceId,
          dealId: deal.id,
          type: "EMAIL",
          summary: email ? `メール受信: ${email.fromEmail}` : "元メール",
          refId: proposal.sourceId,
        });
      }

      await tx.aiProposal.update({ where: { id: proposal.id }, data: { dealId: deal.id } });
      return { dealId: deal.id, taskId };
    }

    case "NEW_CONTACT": {
      const payload = validateProposalPayload("NEW_CONTACT", rawPayload) as NewContactPayload;
      let companyId: string | undefined;
      if (payload.companyName) {
        const company = await findOrCreateCompanyByName(tx, workspaceId, payload.companyName);
        companyId = company.id;
      }
      const contact = await findOrCreateContactForProposal(tx, workspaceId, {
        name: payload.name,
        email: payload.email,
        title: payload.title,
        companyId,
      });
      if (payload.dealId) {
        await tx.dealContact.upsert({
          where: { dealId_contactId: { dealId: payload.dealId, contactId: contact.id } },
          create: { dealId: payload.dealId, contactId: contact.id },
          update: {},
        });
        await recordActivity(tx, {
          workspaceId,
          dealId: payload.dealId,
          type: "SYSTEM",
          summary: `AIがコンタクトを追加: ${payload.name}`,
          refId: contact.id,
        });
      }
      return { contactId: contact.id };
    }

    case "FIELD_UPDATE": {
      const payload = validateProposalPayload("FIELD_UPDATE", rawPayload) as FieldUpdatePayload;
      const deal = await tx.deal.findFirst({ where: { id: payload.dealId, workspaceId } });
      if (!deal) throw Errors.notFound("ディール");

      const updateData: Record<string, unknown> = {};
      if (payload.field === "amount") updateData.amount = Number(payload.newValue);
      else if (payload.field === "name") updateData.name = payload.newValue;
      else if (payload.field === "nextActionAt") updateData.nextActionAt = new Date(payload.newValue);
      else if (payload.field === "stageId") {
        const stage = await resolveStageByName(workspaceId, payload.newValue);
        updateData.stageId = stage.id;
      }

      await tx.deal.update({ where: { id: deal.id }, data: updateData });
      await recordActivity(tx, {
        workspaceId,
        dealId: deal.id,
        type: "SYSTEM",
        summary: `${payload.field}: ${payload.oldValue ?? "未設定"} → ${payload.newValue}`,
        refId: proposal.id,
      });
      return { dealId: deal.id };
    }

    case "DRAFT_EMAIL": {
      const payload = validateProposalPayload("DRAFT_EMAIL", rawPayload) as DraftEmailPayload;
      let dealId = payload.dealId ?? null;
      if (!dealId) {
        const link = await tx.dealContact.findFirst({
          where: { contactId: payload.contactId },
          orderBy: { dealId: "desc" },
        });
        dealId = link?.dealId ?? null;
      }
      await recordActivity(tx, {
        workspaceId,
        dealId,
        type: "CHAT_ACTION",
        summary: `フォローアップを送信: ${payload.subject}`,
        refId: proposal.id,
      });
      return { dealId: dealId ?? undefined };
    }

    case "TASK": {
      const payload = validateProposalPayload("TASK", rawPayload) as TaskPayload;
      const task = await tx.task.create({
        data: {
          workspaceId,
          dealId: payload.dealId ?? null,
          title: payload.title,
          dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
          source: "AI",
        },
      });
      await recordActivity(tx, {
        workspaceId,
        dealId: payload.dealId,
        type: "TASK",
        summary: `AI提案タスク: ${payload.title}`,
        refId: task.id,
      });
      return { dealId: payload.dealId, taskId: task.id };
    }

    default:
      throw Errors.internal(`未知の提案タイプ: ${proposal.type}`);
  }
}
