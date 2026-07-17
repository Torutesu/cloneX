import { prisma } from "@/lib/prisma";
import { DEFAULT_STAGES } from "@/lib/services/pipelineService";

export async function createWorkspaceForUser(userId: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name } });
    await tx.workspaceMember.create({
      data: { userId, workspaceId: workspace.id, role: "OWNER" },
    });
    const pipeline = await tx.pipeline.create({
      data: { workspaceId: workspace.id, name: "Sales", isDefault: true },
    });
    await tx.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({
        pipelineId: pipeline.id,
        name: s.name,
        order: s.order,
        probability: s.probability,
        isWon: s.isWon,
        isLost: s.isLost,
      })),
    });
    return workspace;
  });
}
