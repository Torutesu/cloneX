import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { listProposals, createProposal } from "@/lib/services/proposalService";
import type { ProposalStatus, ProposalType } from "@prisma/client";

const createSchema = z.object({
  type: z.literal("DRAFT_EMAIL"),
  payload: z.record(z.string(), z.unknown()),
  sourceType: z.literal("CHAT"),
  sourceId: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const status = req.nextUrl.searchParams.get("status") as ProposalStatus | null;
  const type = req.nextUrl.searchParams.get("type") as ProposalType | null;
  const countOnly = req.nextUrl.searchParams.get("count") === "true";
  const result = await listProposals(workspace.id, {
    status: status ?? undefined,
    type: type ?? undefined,
    countOnly,
  });
  return NextResponse.json(result);
});

// SCR-004 "承認キューに入れる": user-approved DraftPreviewCard becomes a real PENDING proposal.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = createSchema.parse(await req.json());
  const proposal = await createProposal(workspace.id, parsed);
  return NextResponse.json({ proposal });
});
