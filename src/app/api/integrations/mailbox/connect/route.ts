import { NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { connectMailbox } from "@/lib/services/mailboxService";

export const POST = withErrorHandling(async () => {
  const { workspace } = await requireWorkspaceContext();
  const result = await connectMailbox(workspace.id);
  return NextResponse.json(result);
});
