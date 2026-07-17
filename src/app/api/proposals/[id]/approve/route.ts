import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { approveProposal } from "@/lib/services/proposalService";

const bodySchema = z.object({ payload: z.record(z.string(), z.unknown()).optional() });

export const POST = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { user, workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const raw = await req.text();
  const parsed = raw ? bodySchema.parse(JSON.parse(raw)) : {};
  const { proposal, created } = await approveProposal(workspace.id, id, user.id, parsed.payload);
  return NextResponse.json({ proposal, created });
});
