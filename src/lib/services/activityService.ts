import { prisma } from "@/lib/prisma";
import type { ActivityType, Prisma } from "@prisma/client";

export async function listActivities(
  workspaceId: string,
  opts: { dealId?: string; limit?: number } = {},
) {
  return prisma.activity.findMany({
    where: { workspaceId, ...(opts.dealId ? { dealId: opts.dealId } : {}) },
    orderBy: { occurredAt: "desc" },
    take: opts.limit ?? 50,
  });
}

export async function recordActivity(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    workspaceId: string;
    dealId?: string | null;
    type: ActivityType;
    summary: string;
    refId?: string | null;
    occurredAt?: Date;
  },
) {
  return tx.activity.create({
    data: {
      workspaceId: params.workspaceId,
      dealId: params.dealId ?? null,
      type: params.type,
      summary: params.summary,
      refId: params.refId ?? null,
      ...(params.occurredAt ? { occurredAt: params.occurredAt } : {}),
    },
  });
}
