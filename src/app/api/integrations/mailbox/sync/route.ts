import { NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { syncMailbox } from "@/lib/services/mailboxService";

export const POST = withErrorHandling(async () => {
  const { workspace } = await requireWorkspaceContext();
  const result = await syncMailbox(workspace.id);
  return NextResponse.json(result);
});
