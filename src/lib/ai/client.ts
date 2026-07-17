import Anthropic from "@anthropic-ai/sdk";
import { matchEmailFixture } from "@/lib/ai/fixtureRegistry";
import { resolveFixtureSentinels } from "@/lib/ai/sentinels";
import { runChatFixture, runChatLive } from "@/lib/ai/chat";
import { aiEmailAnalysisResultSchema, type AiProposalDraft } from "@/lib/proposals/types";
import type { AiMode, EmailAnalysisInput, EmailAnalysisResult, ChatInput, ChatResult } from "@/lib/ai/types";

export type { AiMode, EmailAnalysisInput, EmailAnalysisResult, ChatInput, ChatResult };

export function getAiMode(): AiMode {
  const mode = process.env.AI_MODE;
  if (mode === "live" && process.env.ANTHROPIC_API_KEY) return "live";
  return "fixture";
}

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
  return mode === "fixture" ? runChatFixture(input) : runChatLive(input);
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

const EMAIL_ANALYSIS_TOOL = "return_proposals";

/**
 * AIF-001 live mode: single mid-tier call, structured output forced via tool_choice
 * so the model must return `{proposals: [...]}` matching aiEmailAnalysisResultSchema
 * (the same schema fixture mode's payloads are validated against elsewhere).
 */
async function completeEmailAnalysisLive(input: EmailAnalysisInput): Promise<EmailAnalysisResult> {
  const client = new Anthropic();
  const model = process.env.AI_MODEL_MID || "claude-sonnet-5";

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system:
      "あなたはCRMのメール解析アシスタントです。メール本文からAI提案(AiProposal)を0件以上生成してください。" +
      "判定ルール: 送信者emailが既存Contactに一致し既存Dealあり→FIELD_UPDATE/TASK系。未知の送信者+商談意図→NEW_DEAL(コンタクト・企業込み)。" +
      "商談と無関係(ニュースレター等)→提案0件。" +
      `return_proposals ツールで {proposals: [{type, confidence, payload}]} を返してください。`,
    tools: [
      {
        name: EMAIL_ANALYSIS_TOOL,
        description: "解析結果として0件以上のAI提案を返す",
        input_schema: {
          type: "object",
          properties: {
            proposals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["NEW_DEAL", "NEW_CONTACT", "FIELD_UPDATE", "DRAFT_EMAIL", "TASK"],
                  },
                  confidence: { type: "number" },
                  payload: { type: "object" },
                },
                required: ["type", "confidence", "payload"],
              },
            },
          },
          required: ["proposals"],
        },
      },
    ],
    tool_choice: { type: "tool", name: EMAIL_ANALYSIS_TOOL },
    messages: [
      {
        role: "user",
        content: `送信元: ${input.email.fromName ?? ""} <${input.email.fromEmail}>\n件名: ${input.email.subject}\n本文:\n${input.email.bodyText}`,
      },
    ],
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return { kind: "email_analysis", proposals: [] };

  const parsed = aiEmailAnalysisResultSchema.parse(toolUse.input);
  return { kind: "email_analysis", proposals: parsed.proposals as AiProposalDraft[] };
}
