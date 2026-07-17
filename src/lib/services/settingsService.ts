import { prisma } from "@/lib/prisma";
import type { ProposalType } from "@prisma/client";

const ALL_PROPOSAL_TYPES: ProposalType[] = ["NEW_DEAL", "NEW_CONTACT", "FIELD_UPDATE", "DRAFT_EMAIL", "TASK"];

export async function getAutoApprovePolicies(workspaceId: string) {
  const existing = await prisma.autoApprovePolicy.findMany({ where: { workspaceId } });
  const byType = new Map(existing.map((p) => [p.proposalType, p]));
  // Always return one row per ProposalType, defaulting to disabled/threshold=1.01 (spec default).
  return ALL_PROPOSAL_TYPES.map(
    (type) =>
      byType.get(type) ?? {
        id: `unset-${type}`,
        workspaceId,
        proposalType: type,
        threshold: 1.01,
        enabled: false,
      },
  );
}

export async function putAutoApprovePolicies(
  workspaceId: string,
  policies: { proposalType: ProposalType; enabled: boolean; threshold: number }[],
) {
  for (const p of policies) {
    await prisma.autoApprovePolicy.upsert({
      where: { workspaceId_proposalType: { workspaceId, proposalType: p.proposalType } },
      create: { workspaceId, proposalType: p.proposalType, enabled: p.enabled, threshold: p.threshold },
      update: { enabled: p.enabled, threshold: p.threshold },
    });
  }
  return getAutoApprovePolicies(workspaceId);
}
