import { NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { listChatMessages } from "@/lib/services/chatService";

export const GET = withErrorHandling(async () => {
  const { workspace } = await requireWorkspaceContext();
  const messages = await listChatMessages(workspace.id);
  return NextResponse.json({ messages });
});
