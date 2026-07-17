import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/services/activityService";

export async function createNote(workspaceId: string, data: { dealId: string; body: string }) {
  return prisma.$transaction(async (tx) => {
    const note = await tx.note.create({
      data: { workspaceId, dealId: data.dealId, body: data.body },
    });
    await recordActivity(tx, {
      workspaceId,
      dealId: data.dealId,
      type: "NOTE",
      summary: data.body.length > 80 ? `${data.body.slice(0, 80)}…` : data.body,
      refId: note.id,
    });
    return note;
  });
}
