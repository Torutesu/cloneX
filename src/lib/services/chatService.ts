import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/ai/client";

export async function listChatMessages(workspaceId: string) {
  return prisma.chatMessage.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
}

const HISTORY_TURNS = 10;

/**
 * AIF-002 (NL query) / AIF-003 (followup draft) entry point for POST /api/chat.
 * Persists both ChatMessage rows (SCR-004 history + the fallback-with-warning UX,
 * E2E-018), passing the last `HISTORY_TURNS` round-trips as input_context per
 * 05-ai-features.md. `toolCalls` stores the tool names run plus any UI payload
 * (dealRefs / draft) the assistant bubble renders (src/app/app/chat/page.tsx).
 */
export async function sendChatMessage(workspaceId: string, userId: string, content: string) {
  const userMessage = await prisma.chatMessage.create({
    data: { workspaceId, userId, role: "USER", content },
  });

  const recent = await prisma.chatMessage.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS * 2,
  });
  const history = recent
    .filter((m) => m.id !== userMessage.id)
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  const result = await complete({
    kind: "chat",
    workspaceId,
    message: content,
    history,
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      workspaceId,
      userId: null,
      role: "ASSISTANT",
      content: result.content,
      toolCalls: {
        calls: result.toolCalls,
        error: result.error ?? false,
        ...(result.dealRefs ? { dealRefs: result.dealRefs } : {}),
        ...(result.draft ? { draft: result.draft } : {}),
      } as never,
    },
  });

  return { userMessage, assistantMessage };
}
