import { prisma } from "@/lib/prisma";

export const DEFAULT_STAGES = [
  { name: "Lead", order: 1, probability: 10, isWon: false, isLost: false },
  { name: "Qualified", order: 2, probability: 30, isWon: false, isLost: false },
  { name: "Proposal", order: 3, probability: 50, isWon: false, isLost: false },
  { name: "Negotiation", order: 4, probability: 70, isWon: false, isLost: false },
  { name: "Won", order: 5, probability: 100, isWon: true, isLost: false },
  { name: "Lost", order: 6, probability: 0, isWon: false, isLost: true },
] as const;

export async function getDefaultPipeline(workspaceId: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!pipeline) {
    throw new Error(`No default pipeline for workspace ${workspaceId}`);
  }
  return pipeline;
}

/** Resolves a Stage by (case-insensitive) name within the workspace's default pipeline; falls back to the first stage. */
export async function resolveStageByName(workspaceId: string, stageName: string | undefined) {
  const pipeline = await getDefaultPipeline(workspaceId);
  const first = pipeline.stages[0];
  if (!first) throw new Error(`Pipeline ${pipeline.id} has no stages`);
  const match = stageName
    ? pipeline.stages.find((s) => s.name.toLowerCase() === stageName.toLowerCase())
    : undefined;
  return match ?? first;
}
