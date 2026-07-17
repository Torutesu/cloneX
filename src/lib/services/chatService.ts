import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/ai/client";

export async function listChatMessages(workspaceId: string) {
  return prisma.chatMessage.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
}

/**
 * AIF-002/003 are stubbed in Phase 0-1 (see src/lib/ai/client.ts completeChatFixture):
 * always returns the fixed fallback message. Still persists both ChatMessage rows so
 * SCR-004's history and the fallback-with-warning UX (E2E-018) have real data to render
 * once the chat screen is built.
 */
export async function sendChatMessage(workspaceId: string, userId: string, content: string) {
  const userMessage = await prisma.chatMessage.create({
    data: { workspaceId, userId, role: "USER", content },
  });

  const result = await complete({
    kind: "chat",
    workspaceId,
    message: content,
    history: [],
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      workspaceId,
      userId: null,
      role: "ASSISTANT",
      content: result.content,
      toolCalls: { calls: result.toolCalls, error: result.error ?? false } as never,
    },
  });

  return { userMessage, assistantMessage };
}
