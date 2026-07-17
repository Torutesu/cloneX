import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { Errors, withErrorHandling } from "@/lib/api/errors";
import { getSyncStatus } from "@/lib/services/mailboxService";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) throw Errors.validation("jobId を指定してください");
  const status = getSyncStatus(workspace.id, jobId);
  if (!status) throw Errors.notFound("同期ジョブ");
  return NextResponse.json(status);
});
