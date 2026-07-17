import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { deleteToken } from "@/lib/services/tokenService";

export const DELETE = withErrorHandling(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  await deleteToken(workspace.id, id);
  return new NextResponse(null, { status: 204 });
});
