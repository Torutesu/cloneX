import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { rejectProposal } from "@/lib/services/proposalService";

export const POST = withErrorHandling(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { user, workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const proposal = await rejectProposal(workspace.id, id, user.id);
  return NextResponse.json({ proposal });
});
