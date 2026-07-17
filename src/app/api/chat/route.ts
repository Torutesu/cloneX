import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { sendChatMessage } from "@/lib/services/chatService";

const bodySchema = z.object({ content: z.string().min(1) });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { user, workspace } = await requireWorkspaceContext();
  const parsed = bodySchema.parse(await req.json());
  const { userMessage, assistantMessage } = await sendChatMessage(workspace.id, user.id, parsed.content);
  return NextResponse.json({ userMessage, assistantMessage });
});
