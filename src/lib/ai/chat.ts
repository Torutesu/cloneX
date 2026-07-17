import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { executeTool, toolDefs, toJsonSchema, type ToolName } from "@/lib/ai/tools";
import { listContacts, getContactById } from "@/lib/services/contactService";
import { listActivities } from "@/lib/services/activityService";
import type { ChatDealRef, ChatDraft, ChatInput, ChatResult } from "@/lib/ai/types";
// Statically imported (not read from disk at request time) — see
// src/lib/ai/fixtureRegistry.ts for why (no `fs` under Cloudflare Workers).
import chatPatternsFixture from "../../../fixtures/ai/chat-patterns.json";

const ERROR_RESULT: ChatResult = {
  kind: "chat",
  content: "応答を生成できませんでした",
  toolCalls: [],
  error: true,
};

// ===== AIF-002/003 fixture mode =====
// Deterministic response templates keyed by the exact E2E phrasing per
// fixtures/ai/chat-patterns.json. Tool execution (deals_search / contact
// resolution) always runs against the real service layer — only the
// generated text is fixture-templated (05-ai-features.md "fixtureとliveで
// コードパスを分岐させない(返り値の差し替えのみ)").

type QueryPattern = {
  input: string;
  intent: "query";
  tool: "deals_search";
  args: Record<string, unknown>;
  foundTemplate: string;
  emptyTemplate: string;
};
type ActionPattern = {
  input: string;
  intent: "action";
  contactName: string;
  subjectTemplate: string;
  bodyTemplate: string;
  reason: string;
};
type ErrorPattern = { input: string; intent: "error" };
type ChatPattern = QueryPattern | ActionPattern | ErrorPattern;

function loadPatterns(): ChatPattern[] {
  return (chatPatternsFixture as { patterns: ChatPattern[] }).patterns;
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(vars[key] ?? ""));
}

type ContactResolution =
  | { kind: "none" }
  | { kind: "ambiguous"; candidates: Awaited<ReturnType<typeof listContacts>> }
  | { kind: "one"; contact: Awaited<ReturnType<typeof listContacts>>[number]; deal: { id: string; name: string } | null };

/** Resolves a contact by (fuzzy, then exact-filtered) name, per AIF-003's "対象コンタクトが一意に解決できない場合は候補リスト" rule. */
async function resolveContactByName(workspaceId: string, name: string): Promise<ContactResolution> {
  const candidates = await listContacts(workspaceId, name);
  const exact = candidates.filter((c) => c.name === name);
  const pool = exact.length > 0 ? exact : candidates;
  if (pool.length === 0) return { kind: "none" };
  if (pool.length > 1) return { kind: "ambiguous", candidates: pool };
  const contact = pool[0]!;
  const { deals } = await getContactById(workspaceId, contact.id);
  const deal = [...deals].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0] ?? null;
  return { kind: "one", contact, deal: deal ? { id: deal.id, name: deal.name } : null };
}

function candidateLabel(c: { name: string; company?: { name: string } | null }): string {
  return `${c.name}(${c.company?.name ?? "所属不明"})`;
}

async function runQueryPattern(workspaceId: string, pattern: QueryPattern): Promise<ChatResult> {
  const results = (await executeTool(workspaceId, pattern.tool, pattern.args)) as Array<{
    id: string;
    name: string;
    amount: number | null;
    updatedAt: Date | string;
    stage?: { name: string };
  }>;
  const dealRefs: ChatDealRef[] = results.map((d) => ({
    id: d.id,
    name: d.name,
    stageName: d.stage?.name,
    amount: d.amount,
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : d.updatedAt.toISOString(),
  }));
  const content = fillTemplate(dealRefs.length > 0 ? pattern.foundTemplate : pattern.emptyTemplate, {
    count: dealRefs.length,
  });
  return {
    kind: "chat",
    content,
    toolCalls: [pattern.tool],
    ...(dealRefs.length > 0 ? { dealRefs } : {}),
  };
}

async function runActionPattern(workspaceId: string, pattern: ActionPattern): Promise<ChatResult> {
  const resolved = await resolveContactByName(workspaceId, pattern.contactName);

  if (resolved.kind === "none") {
    return {
      kind: "chat",
      content: `「${pattern.contactName}」という名前のコンタクトが見つかりませんでした。名前や会社名を教えてください。`,
      toolCalls: ["contacts_search"],
    };
  }
  if (resolved.kind === "ambiguous") {
    const list = resolved.candidates.map(candidateLabel).join(" / ");
    return {
      kind: "chat",
      content: `「${pattern.contactName}」に一致するコンタクトが複数見つかりました: ${list}。どちらの方でしょうか?`,
      toolCalls: ["contacts_search"],
    };
  }

  const { contact, deal } = resolved;
  const dealName = deal?.name ?? "";
  const subject = fillTemplate(pattern.subjectTemplate, { contactName: contact.name, dealName });
  const body = fillTemplate(pattern.bodyTemplate, { contactName: contact.name, dealName });
  const draft: ChatDraft = {
    contactId: contact.id,
    contactName: contact.name,
    dealId: deal?.id,
    subject,
    body,
    reason: pattern.reason,
  };
  return {
    kind: "chat",
    content: `${contact.name}様へのフォローアップ草稿を作成しました。内容を確認してください。`,
    toolCalls: ["draft_followup"],
    draft,
  };
}

export async function runChatFixture(input: ChatInput): Promise<ChatResult> {
  const normalized = input.message.trim();
  const pattern = loadPatterns().find((p) => p.input === normalized);
  if (!pattern || pattern.intent === "error") return ERROR_RESULT;
  if (pattern.intent === "query") return runQueryPattern(input.workspaceId, pattern);
  return runActionPattern(input.workspaceId, pattern);
}

// ===== AIF-002/003 live mode =====
// model_tier per 05-ai-features.md: AIF-002 (query, tool-use loop) = mid;
// AIF-003 (followup draft generation) = high. Both share the Zod-validated
// ChatResult/ChatDraft shape with fixture mode (no code-path branching besides
// this fixture/live split in src/lib/ai/client.ts).

const QUERY_TOOL_NAMES: ToolName[] = ["deals_search", "contacts_search", "tasks_list", "activities_list"];
const DRAFT_FOLLOWUP_TOOL = "draft_followup";
const MAX_TOOL_ITERATIONS = 5;

function midModel(): string {
  return process.env.AI_MODEL_MID || "claude-sonnet-5";
}
function highModel(): string {
  return process.env.AI_MODEL_HIGH || "claude-fable-5";
}

function toContentBlockParams(blocks: Anthropic.ContentBlock[]): Anthropic.ContentBlockParam[] {
  const out: Anthropic.ContentBlockParam[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      out.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      out.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
    }
    // Other block types (thinking, server-tool blocks, ...) aren't produced by
    // this tool set and are intentionally dropped rather than echoed back.
  }
  return out;
}

const draftFollowupResultSchema = z.object({ subject: z.string(), body: z.string(), reason: z.string() });

async function generateFollowupDraftLive(
  client: Anthropic,
  workspaceId: string,
  contactName: string,
): Promise<ChatDraft | { clarify: string }> {
  const resolved = await resolveContactByName(workspaceId, contactName);
  if (resolved.kind === "none") {
    return { clarify: `「${contactName}」という名前のコンタクトが見つかりませんでした。名前や会社名を教えてください。` };
  }
  if (resolved.kind === "ambiguous") {
    const list = resolved.candidates.map(candidateLabel).join(" / ");
    return { clarify: `「${contactName}」に一致するコンタクトが複数見つかりました: ${list}。どちらの方でしょうか?` };
  }

  const { contact, deal } = resolved;
  const activities = deal ? await listActivities(workspaceId, { dealId: deal.id, limit: 10 }) : [];
  const timelineDigest = activities.map((a) => `- ${a.summary}`).join("\n") || "(タイムラインなし)";

  const response = await client.messages.create({
    model: highModel(),
    max_tokens: 1024,
    system:
      "あなたは営業担当者の代わりに顧客へのフォローアップメール草稿を書くアシスタントです。" +
      "draft_followup_result ツールで {subject, body, reason} を日本語のビジネスメールとして返してください。",
    tools: [
      {
        name: "draft_followup_result",
        description: "フォローアップメールの草稿を返す",
        input_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            reason: { type: "string", description: "この文面にした根拠" },
          },
          required: ["subject", "body", "reason"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "draft_followup_result" },
    messages: [
      {
        role: "user",
        content: `宛先: ${contact.name}\n案件: ${deal?.name ?? "(紐づく案件なし)"}\n直近のタイムライン:\n${timelineDigest}\n\nこの相手へのフォローアップメール草稿を作成してください。`,
      },
    ],
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return { clarify: "応答を生成できませんでした" };
  const parsed = draftFollowupResultSchema.parse(toolUse.input);
  return {
    contactId: contact.id,
    contactName: contact.name,
    dealId: deal?.id,
    subject: parsed.subject,
    body: parsed.body,
    reason: parsed.reason,
  };
}

export async function runChatLive(input: ChatInput): Promise<ChatResult> {
  try {
    const client = new Anthropic();
    const queryTools: Anthropic.Tool[] = QUERY_TOOL_NAMES.map((name) => ({
      name,
      description: toolDefs[name].description,
      input_schema: toJsonSchema(toolDefs[name].schema),
    }));
    const draftFollowupTool: Anthropic.Tool = {
      name: DRAFT_FOLLOWUP_TOOL,
      description:
        "ユーザーの発言がフォローアップ送信などのアクション指示だと判断した場合に呼び出す。対象コンタクトの名前を渡す。",
      input_schema: {
        type: "object",
        properties: { contactName: { type: "string", description: "指示対象のコンタクト名" } },
        required: ["contactName"],
      },
    };

    const messages: Anthropic.MessageParam[] = [
      ...input.history.map((h) => ({
        role: (h.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: input.message },
    ];

    const system =
      "あなたはCRM『cloneX』のアシスタントです。ユーザーの質問には deals_search / contacts_search / tasks_list / activities_list ツールで調べてから日本語で簡潔に回答してください。" +
      "検索結果が0件の場合は失敗と言わず「見つかりませんでした」と伝え、条件の言い換えを提案してください。" +
      "ユーザーの発言が『(名前)さんにフォローアップして』のようなアクション指示の場合は draft_followup ツールを呼び出してください。";

    const toolCallNames: string[] = [];
    const dealRefs: ChatDealRef[] = [];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: midModel(),
        max_tokens: 1024,
        system,
        tools: [...queryTools, draftFollowupTool],
        messages,
      });

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) {
        const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
        return {
          kind: "chat",
          content: text || "応答を生成できませんでした",
          toolCalls: toolCallNames,
          ...(dealRefs.length ? { dealRefs } : {}),
          ...(text ? {} : { error: true }),
        };
      }

      messages.push({ role: "assistant", content: toContentBlockParams(response.content) });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let draftResult: ChatResult | null = null;

      for (const use of toolUses) {
        toolCallNames.push(use.name);
        if (use.name === DRAFT_FOLLOWUP_TOOL) {
          const { contactName } = z.object({ contactName: z.string() }).parse(use.input);
          const draft = await generateFollowupDraftLive(client, input.workspaceId, contactName);
          if ("clarify" in draft) {
            draftResult = { kind: "chat", content: draft.clarify, toolCalls: toolCallNames };
          } else {
            draftResult = {
              kind: "chat",
              content: `${draft.contactName}様へのフォローアップ草稿を作成しました。`,
              toolCalls: toolCallNames,
              draft,
            };
          }
          toolResults.push({ type: "tool_result", tool_use_id: use.id, content: "草稿を提示しました。" });
          continue;
        }
        try {
          const result = await executeTool(input.workspaceId, use.name, use.input);
          if (use.name === "deals_search" && Array.isArray(result)) {
            for (const d of result as Array<{
              id: string;
              name: string;
              amount: number | null;
              updatedAt: Date | string;
              stage?: { name: string };
            }>) {
              dealRefs.push({
                id: d.id,
                name: d.name,
                stageName: d.stage?.name,
                amount: d.amount,
                updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : d.updatedAt.toISOString(),
              });
            }
          }
          toolResults.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content: err instanceof Error ? err.message : "ツール実行エラー",
          });
        }
      }

      if (draftResult) return draftResult;
      messages.push({ role: "user", content: toolResults });
    }

    return { kind: "chat", content: "応答を生成できませんでした", toolCalls: toolCallNames, error: true };
  } catch {
    return ERROR_RESULT;
  }
}
