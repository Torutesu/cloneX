import { matchEmailFixture } from "@/lib/ai/fixtureRegistry";
import { resolveFixtureSentinels } from "@/lib/ai/sentinels";
import type { AiProposalDraft } from "@/lib/proposals/types";

export type AiMode = "live" | "fixture";

export function getAiMode(): AiMode {
  const mode = process.env.AI_MODE;
  if (mode === "live" && process.env.ANTHROPIC_API_KEY) return "live";
  return "fixture";
}

export type EmailAnalysisInput = {
  kind: "email_analysis";
  workspaceId: string;
  email: { fromEmail: string; fromName?: string | null; subject: string; bodyText: string };
};

export type ChatInput = {
  kind: "chat";
  workspaceId: string;
  message: string;
  history: { role: "USER" | "ASSISTANT"; content: string }[];
};

export type EmailAnalysisResult = { kind: "email_analysis"; proposals: AiProposalDraft[] };
export type ChatResult = {
  kind: "chat";
  content: string;
  toolCalls: unknown[];
  error?: boolean;
};

/**
 * Single call-site for all AI Feature calls (AIF-001/002/003). Fixture and live mode
 * share this exact signature and the same Zod-validated output shape so no code path
 * downstream needs to know which mode is active (05-ai-features.md "Fixtureモード").
 */
export async function complete(input: EmailAnalysisInput): Promise<EmailAnalysisResult>;
export async function complete(input: ChatInput): Promise<ChatResult>;
export async function complete(
  input: EmailAnalysisInput | ChatInput,
): Promise<EmailAnalysisResult | ChatResult> {
  const mode = getAiMode();
  if (input.kind === "email_analysis") {
    return mode === "fixture" ? completeEmailAnalysisFixture(input) : completeEmailAnalysisLive(input);
  }
  return mode === "fixture" ? completeChatFixture(input) : completeChatLive(input);
}

async function completeEmailAnalysisFixture(input: EmailAnalysisInput): Promise<EmailAnalysisResult> {
  const fixture = matchEmailFixture(input.email);
  if (!fixture) {
    // Unmatched content = no signal (AIF-001 rule: "商談と無関係(ニュースレター等)→提案0件").
    return { kind: "email_analysis", proposals: [] };
  }
  const resolved = await Promise.all(
    fixture.expectedProposals.map(async (draft) => ({
      ...draft,
      payload: (await resolveFixtureSentinels(input.workspaceId, draft.payload)) as Record<string, unknown>,
    })),
  );
  return { kind: "email_analysis", proposals: resolved };
}

async function completeChatFixture(_input: ChatInput): Promise<ChatResult> {
  // AIF-002/003 are stubbed in this build phase: always the fixed fallback response.
  // Phase 3 replaces this branch with fixtures/ai/chat.json pattern matching.
  return {
    kind: "chat",
    content: "応答を生成できませんでした",
    toolCalls: [],
    error: true,
  };
}

async function completeEmailAnalysisLive(_input: EmailAnalysisInput): Promise<EmailAnalysisResult> {
  throw new Error(
    "AI_MODE=live is not implemented yet (Phase 3). Set AI_MODE=fixture or provide ANTHROPIC_API_KEY once the live path lands.",
  );
}

async function completeChatLive(_input: ChatInput): Promise<ChatResult> {
  throw new Error("AI_MODE=live chat is not implemented yet (Phase 3).");
}
