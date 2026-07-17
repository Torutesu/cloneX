import type { AiProposalDraft } from "@/lib/proposals/types";

// Shared types for the single AI call-site (src/lib/ai/client.ts). Split out of
// client.ts so src/lib/ai/chat.ts (AIF-002/003 fixture + live logic) can depend on
// these shapes without a circular runtime import.

export type AiMode = "live" | "fixture";

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

/** {type: "deal_ref", id} entities per 05-ai-features.md AIF-002 — rendered by SCR-004's DealRefCard. */
export type ChatDealRef = {
  id: string;
  name: string;
  stageName?: string;
  amount?: number | null;
  updatedAt?: string;
};

/** `draft_followup` output shape per 05-ai-features.md AIF-003 — rendered by SCR-004's DraftPreviewCard. */
export type ChatDraft = {
  contactId: string;
  contactName: string;
  dealId?: string;
  subject: string;
  body: string;
  reason?: string;
};

export type ChatResult = {
  kind: "chat";
  content: string;
  /** Tool names executed this turn (e.g. ["deals_search"] or ["draft_followup"]) — stored in ChatMessage.toolCalls and rendered as "🔍 <name> を実行". */
  toolCalls: string[];
  dealRefs?: ChatDealRef[];
  draft?: ChatDraft;
  error?: boolean;
};
