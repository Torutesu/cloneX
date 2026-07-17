import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { recordActivity } from "@/lib/services/activityService";
import type { TaskStatus } from "@prisma/client";

export async function listTasks(
  workspaceId: string,
  opts: { status?: TaskStatus; dueBefore?: Date } = {},
) {
  return prisma.task.findMany({
    where: {
      workspaceId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.dueBefore ? { dueAt: { lte: opts.dueBefore } } : {}),
    },
    include: { deal: true },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function createTask(
  workspaceId: string,
  data: { title: string; dueAt?: string; dealId?: string },
) {
  return prisma.task.create({
    data: {
      workspaceId,
      title: data.title,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      dealId: data.dealId ?? null,
    },
  });
}

export async function updateTask(
  workspaceId: string,
  id: string,
  data: { status?: TaskStatus; title?: string; dueAt?: string | null },
) {
  const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
  if (!existing) throw Errors.notFound("タスク");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
      },
    });
    if (data.status === "DONE" && existing.status !== "DONE" && existing.dealId) {
      await recordActivity(tx, {
        workspaceId,
        dealId: existing.dealId,
        type: "TASK",
        summary: `完了: ${updated.title}`,
        refId: updated.id,
      });
    }
    return updated;
  });
}
