import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { listActivities } from "@/lib/services/activityService";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const dealId = req.nextUrl.searchParams.get("dealId") ?? undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const activities = await listActivities(workspace.id, {
    dealId,
    limit: limitParam ? Number(limitParam) : undefined,
  });
  return NextResponse.json({ activities });
});
