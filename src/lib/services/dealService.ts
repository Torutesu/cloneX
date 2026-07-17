import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { recordActivity } from "@/lib/services/activityService";
import { getDefaultPipeline } from "@/lib/services/pipelineService";

const STUCK_DAYS = 10;

export function isStuck(updatedAt: Date, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - updatedAt.getTime();
  return diffMs >= STUCK_DAYS * 24 * 60 * 60 * 1000;
}

export async function getBoard(workspaceId: string) {
  const pipeline = await getDefaultPipeline(workspaceId);
  const stages = await Promise.all(
    pipeline.stages.map(async (stage) => {
      const deals = await prisma.deal.findMany({
        where: { workspaceId, stageId: stage.id },
        include: { company: true, contacts: { include: { contact: true } } },
        orderBy: { updatedAt: "desc" },
      });
      const totalAmount = deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
      // 加重額 = ステージ勝率で割り引いた期待値。フォーキャストのベース。
      const weightedAmount = Math.round((totalAmount * stage.probability) / 100);
      return {
        stage,
        deals: deals.map((d) => ({ ...d, stuck: isStuck(d.updatedAt) })),
        totalAmount,
        weightedAmount,
      };
    }),
  );
  return { stages };
}

export async function createDeal(
  workspaceId: string,
  data: {
    name: string;
    stageId?: string;
    amount?: number;
    companyId?: string;
    contactIds?: string[];
  },
) {
  const pipeline = await getDefaultPipeline(workspaceId);
  const firstStage = pipeline.stages[0];
  if (!firstStage) throw Errors.internal("パイプラインにステージがありません");
  const stageId = data.stageId ?? firstStage.id;
  const stage = pipeline.stages.find((s) => s.id === stageId);
  if (!stage) throw Errors.validation("stageId が不正です");

  return prisma.deal.create({
    data: {
      workspaceId,
      pipelineId: pipeline.id,
      stageId,
      name: data.name,
      amount: data.amount ?? null,
      companyId: data.companyId ?? null,
      contacts: data.contactIds
        ? { create: data.contactIds.map((contactId) => ({ contactId })) }
        : undefined,
    },
  });
}

export async function getDealById(workspaceId: string, id: string) {
  const deal = await prisma.deal.findFirst({
    where: { id, workspaceId },
    include: {
      stage: true,
      company: true,
      contacts: { include: { contact: true } },
    },
  });
  if (!deal) throw Errors.notFound("ディール");
  const [rawActivities, tasks, notes, pendingProposalCount] = await Promise.all([
    prisma.activity.findMany({ where: { workspaceId, dealId: id }, orderBy: { occurredAt: "desc" } }),
    prisma.task.findMany({ where: { workspaceId, dealId: id }, orderBy: { dueAt: "asc" } }),
    prisma.note.findMany({ where: { workspaceId, dealId: id }, orderBy: { createdAt: "desc" } }),
    prisma.aiProposal.count({ where: { workspaceId, dealId: id, status: "PENDING" } }),
  ]);

  // SCR-006 Timeline "EMAILはクリックで本文展開(EmailMessage)" needs the original
  // message body, which Activity doesn't store (only a one-line `summary`). Batch
  // fetch the referenced EmailMessage rows and attach as `emailBody` — additive
  // field, no schema/API contract change (see build-notes.md).
  const emailRefIds = rawActivities.filter((a) => a.type === "EMAIL" && a.refId).map((a) => a.refId as string);
  const emailById = emailRefIds.length
    ? new Map(
        (await prisma.emailMessage.findMany({ where: { id: { in: emailRefIds } } })).map((e) => [e.id, e]),
      )
    : new Map();
  const activities = rawActivities.map((a) => ({
    ...a,
    emailBody: a.type === "EMAIL" && a.refId ? (emailById.get(a.refId)?.bodyText ?? null) : null,
  }));

  return { deal, stage: deal.stage, company: deal.company, contacts: deal.contacts, activities, tasks, notes, pendingProposalCount };
}

export async function updateDeal(
  workspaceId: string,
  id: string,
  data: { name?: string; stageId?: string; amount?: number | null; nextActionAt?: string | null },
) {
  const existing = await prisma.deal.findFirst({ where: { id, workspaceId }, include: { stage: true } });
  if (!existing) throw Errors.notFound("ディール");

  return prisma.$transaction(async (tx) => {
    if (data.stageId && data.stageId !== existing.stageId) {
      const newStage = await tx.stage.findFirst({ where: { id: data.stageId, pipelineId: existing.pipelineId } });
      if (!newStage) throw Errors.validation("stageId が不正です");
      await recordActivity(tx, {
        workspaceId,
        dealId: id,
        type: "SYSTEM",
        summary: `${existing.stage.name} → ${newStage.name}`,
      });
    }
    if (typeof data.amount === "number" && data.amount !== existing.amount) {
      await recordActivity(tx, {
        workspaceId,
        dealId: id,
        type: "SYSTEM",
        summary: `金額を ${existing.amount ?? "未設定"} → ${data.amount} に変更`,
      });
    }
    if (data.name && data.name !== existing.name) {
      await recordActivity(tx, {
        workspaceId,
        dealId: id,
        type: "SYSTEM",
        summary: `名前を「${existing.name}」→「${data.name}」に変更`,
      });
    }
    const updated = await tx.deal.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.stageId ? { stageId: data.stageId } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.nextActionAt !== undefined
          ? { nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null }
          : {}),
      },
    });
    return updated;
  });
}

/** Search used by AIF-002 chat and the MCP `deals_search` tool (src/lib/ai/tools.ts). */
export async function searchDeals(
  workspaceId: string,
  opts: { query?: string; stageName?: string; stuckOnly?: boolean } = {},
) {
  const deals = await prisma.deal.findMany({
    where: {
      workspaceId,
      ...(opts.query
        ? { name: { contains: opts.query, mode: "insensitive" } }
        : {}),
      ...(opts.stageName
        ? { stage: { name: { equals: opts.stageName, mode: "insensitive" } } }
        : {}),
    },
    include: { stage: true, company: true },
    orderBy: { updatedAt: "asc" },
  });
  if (opts.stuckOnly) {
    return deals.filter((d) => isStuck(d.updatedAt) && !d.stage.isWon && !d.stage.isLost);
  }
  return deals;
}
