import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { materializeProposal } from "@/lib/proposals/materialize";
import type { ProposalStatus, ProposalType, ProposalSource } from "@prisma/client";

export async function listProposals(
  workspaceId: string,
  opts: { status?: ProposalStatus; type?: ProposalType; countOnly?: boolean } = {},
) {
  const where = {
    workspaceId,
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.type ? { type: opts.type } : {}),
  };
  if (opts.countOnly) {
    return { count: await prisma.aiProposal.count({ where }) };
  }
  const rawProposals = await prisma.aiProposal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // SCR-010 "sourceの原文をアコーディオン展開(EmailMessage.bodyText)" needs the raw
  // email body, which AiProposal doesn't store (only `sourceId` pointing at it).
  // Batch-fetch and attach as `sourceEmail` — additive field, no schema/API contract
  // change (see build-notes.md).
  const emailIds = rawProposals.filter((p) => p.sourceType === "EMAIL" && p.sourceId).map((p) => p.sourceId as string);
  const emailById = emailIds.length
    ? new Map(
        (await prisma.emailMessage.findMany({ where: { id: { in: emailIds } } })).map((e) => [e.id, e]),
      )
    : new Map();
  const proposals = rawProposals.map((p) => ({
    ...p,
    sourceEmail:
      p.sourceType === "EMAIL" && p.sourceId
        ? (() => {
            const email = emailById.get(p.sourceId as string);
            return email ? { fromEmail: email.fromEmail, fromName: email.fromName, bodyText: email.bodyText } : null;
          })()
        : null,
  }));
  return { proposals };
}

/** Creates a PENDING proposal directly (used by SCR-004 chat "承認キューに入れる" — AIF-003 DRAFT_EMAIL only per spec). */
export async function createProposal(
  workspaceId: string,
  data: {
    type: ProposalType;
    payload: unknown;
    sourceType: ProposalSource;
    sourceId?: string;
    confidence: number;
  },
) {
  return prisma.aiProposal.create({
    data: {
      workspaceId,
      type: data.type,
      payload: data.payload as never,
      sourceType: data.sourceType,
      sourceId: data.sourceId ?? null,
      confidence: data.confidence,
      status: "PENDING",
    },
  });
}

export async function approveProposal(
  workspaceId: string,
  id: string,
  userId: string,
  payloadOverride?: unknown,
) {
  const proposal = await prisma.aiProposal.findFirst({ where: { id, workspaceId } });
  if (!proposal) throw Errors.notFound("提案");
  if (proposal.status !== "PENDING") throw Errors.conflict("この提案はすでに処理済みです");

  return prisma.$transaction(async (tx) => {
    const created = await materializeProposal(tx, proposal, payloadOverride);
    const updated = await tx.aiProposal.update({
      where: { id },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
        resolvedById: userId,
        ...(payloadOverride ? { payload: payloadOverride as never } : {}),
        ...(created.dealId ? { dealId: created.dealId } : {}),
      },
    });
    return { proposal: updated, created };
  });
}

export async function rejectProposal(workspaceId: string, id: string, userId: string) {
  const proposal = await prisma.aiProposal.findFirst({ where: { id, workspaceId } });
  if (!proposal) throw Errors.notFound("提案");
  if (proposal.status !== "PENDING") throw Errors.conflict("この提案はすでに処理済みです");

  return prisma.aiProposal.update({
    where: { id },
    data: { status: "REJECTED", resolvedAt: new Date(), resolvedById: userId },
  });
}

/**
 * AIF-004: evaluates the workspace's AutoApprovePolicy for a freshly generated proposal.
 * If enabled && confidence >= threshold, materialize immediately as AUTO_APPROVED;
 * otherwise leave/create it PENDING. Runs in its own transaction per proposal so one
 * failure (fallback rule) can't corrupt sibling proposals from the same email.
 */
export async function createProposalWithAutoApprove(
  workspaceId: string,
  draft: { type: ProposalType; confidence: number; payload: unknown },
  source: { sourceType: ProposalSource; sourceId?: string },
) {
  const policy = await prisma.autoApprovePolicy.findUnique({
    where: { workspaceId_proposalType: { workspaceId, proposalType: draft.type } },
  });
  const shouldAutoApprove = !!policy?.enabled && draft.confidence >= (policy?.threshold ?? 1.01);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.aiProposal.create({
        data: {
          workspaceId,
          type: draft.type,
          confidence: draft.confidence,
          payload: draft.payload as never,
          sourceType: source.sourceType,
          sourceId: source.sourceId ?? null,
          status: shouldAutoApprove ? "AUTO_APPROVED" : "PENDING",
        },
      });
      if (shouldAutoApprove) {
        const result = await materializeProposal(tx, created);
        return tx.aiProposal.update({
          where: { id: created.id },
          data: { resolvedAt: new Date(), ...(result.dealId ? { dealId: result.dealId } : {}) },
        });
      }
      return created;
    });
  } catch {
    // Fallback rule (AIF-004): materialization failure -> fall back to a normal PENDING proposal
    // so a human can resolve it manually, rather than losing the signal entirely.
    return prisma.aiProposal.create({
      data: {
        workspaceId,
        type: draft.type,
        confidence: draft.confidence,
        payload: draft.payload as never,
        sourceType: source.sourceType,
        sourceId: source.sourceId ?? null,
        status: "PENDING",
      },
    });
  }
}
