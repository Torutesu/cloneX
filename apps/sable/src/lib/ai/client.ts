// 全AI呼び出しの単一入口。AI_MODE=fixture(既定)| live
// liveモードは同一シグネチャ・同一JSONスキーマでClaude APIを呼ぶ
import {
  BrainBuildResult,
  ChatContext,
  ChatResult,
  InsightContext,
  InsightResult,
  SummaryContext,
  SummaryResult,
} from "./types";
import {
  fixtureBuildBrain,
  fixtureChat,
  fixtureDraftAnswer,
  fixtureExtractNodes,
  fixtureGreeting,
  fixtureInsights,
  fixtureSummary,
  fixtureTranslate,
} from "./fixture";
import { detectLanguage as heuristicDetect } from "./matching";

const MODE = () => process.env.AI_MODE ?? "fixture";

// model_tier(05-ai-features.md)→ モデルIDは環境変数で差し替え可能
const MODELS = {
  high: () => process.env.AI_MODEL_HIGH ?? "claude-opus-4-8",
  mid: () => process.env.AI_MODEL_MID ?? "claude-sonnet-5",
  light: () => process.env.AI_MODEL_LIGHT ?? "claude-haiku-4-5-20251001",
};

async function callClaude(model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON in AI response");
  return JSON.parse(match[0]) as T;
}

// ===== AIF-003: 言語判定 =====
export function detectLanguage(text: string, allowed: string[]): string | null {
  // fixture/live共通でヒューリスティックを使用(決定性優先。liveでの高度化は次版)
  return heuristicDetect(text, allowed);
}

// ===== AIF-002/004: Q&A+デモ進行 =====
export async function chat(ctx: ChatContext): Promise<ChatResult> {
  if (MODE() === "fixture") return fixtureChat(ctx);
  const system = `You are ${ctx.personaName}, an AI demo specialist for ${ctx.productName}. Tone: ${ctx.tone}.
Answer ONLY from the knowledge base below. Reply in language "${ctx.language}".
If the knowledge base does not contain the answer, be honest, set confident=false, and promise to follow up.
If a demo step directly shows what was asked, set jumpToStepOrder.
Respond as JSON: {"answer": string, "referencedNodeIds": string[], "confident": boolean, "jumpToStepOrder"?: number}

# Knowledge base
${ctx.nodes.map((n) => `[${n.id}] (${n.kind}) ${n.title}: ${n.body}`).join("\n")}

# Demo steps
${ctx.steps.map((s) => `${s.order}. ${s.title}`).join("\n")} (current: ${ctx.currentStepOrder})`;
  const user = `# Conversation so far
${ctx.history.map((h) => `${h.role}: ${h.text}`).join("\n")}

# Buyer's message
${ctx.question}`;
  return parseJson<ChatResult>(await callClaude(MODELS.mid(), system, user));
}

// ===== AIF-001: Brain構築 =====
export async function buildBrain(productName: string, productUrl: string, sourceTexts: string[]): Promise<BrainBuildResult> {
  if (MODE() === "fixture") return fixtureBuildBrain(productName);
  const system = `You are building the "Brain" for an AI demo employee for the product "${productName}" (${productUrl}).
From the source material, produce JSON:
{"nodes": [{"kind": "FEATURE"|"FAQ"|"OBJECTION"|"OTHER", "title": string, "body": string}] (about 8),
 "steps": [{"order": number, "title": string, "route": string, "selector": string|null, "narration": {"ja","en","zh","es"}}] (exactly 4, routes must be /demo-target/dashboard, /demo-target/board, /demo-target/reports, /demo-target/settings with selectors .kpi-cards, .board-columns, .report-chart, .settings-form),
 "greeting": {"ja","en","zh","es"}}`;
  const user = sourceTexts.join("\n---\n") || `(no sources; infer typical SaaS content for ${productName})`;
  return parseJson<BrainBuildResult>(await callClaude(MODELS.high(), system, user));
}

// ===== AIF-001増分: ソースからナレッジ抽出 =====
export async function extractNodes(
  sourceName: string,
  content: string,
): Promise<{ kind: "FEATURE" | "FAQ" | "OBJECTION" | "OTHER"; title: string; body: string }[]> {
  if (MODE() === "fixture") return fixtureExtractNodes(sourceName, content);
  const system = `Extract knowledge nodes for an AI demo employee from the source below.
Respond as JSON: {"nodes": [{"kind": "FEATURE"|"FAQ"|"OBJECTION"|"OTHER", "title": string, "body": string}]}`;
  const result = await callClaude(MODELS.high(), system, `# ${sourceName}\n${content}`);
  return parseJson<{ nodes: { kind: "FEATURE" | "FAQ" | "OBJECTION" | "OTHER"; title: string; body: string }[] }>(result).nodes;
}

// ===== AIF-005: 要約+資格確認 =====
export async function summarize(ctx: SummaryContext): Promise<SummaryResult> {
  if (MODE() === "fixture") return fixtureSummary(ctx);
  const system = `Summarize this product demo session and extract qualification info.
Write "summary" in language "${ctx.language}". Do NOT invent facts; use null when unknown.
Respond as JSON: {"summary": string, "qualification": {"useCase": string|null, "teamSize": string|null, "timeline": string|null, "interest": 1-5|null, "summary": string}}`;
  const user = `Product: ${ctx.productName}\nBuyer: ${ctx.buyerName ?? "anonymous"} (${ctx.buyerCompany ?? "-"})
Steps shown: ${ctx.shownStepTitles.join(", ") || "none"}
Unanswered questions: ${ctx.gapQuestions.join(" / ") || "none"}
Transcript:\n${ctx.turns.map((t) => `${t.role}: ${t.text}`).join("\n")}`;
  return parseJson<SummaryResult>(await callClaude(MODELS.mid(), system, user));
}

// ===== AIF-006: インサイト =====
export async function generateInsights(ctx: InsightContext): Promise<InsightResult> {
  if (MODE() === "fixture") return fixtureInsights(ctx);
  const system = `Cluster buyer questions from demo sessions, mark whether each cluster is answerable from the knowledge base, and suggest improvements (in Japanese).
Respond as JSON: {"topQuestions": [{"question": string, "count": number, "answered": boolean, "gapId"?: string}], "suggestions": string[]}`;
  const user = `Questions: ${JSON.stringify(ctx.buyerQuestions)}
Open gaps: ${JSON.stringify(ctx.gapIdByQuestion)}
Knowledge titles: ${ctx.nodes.map((n) => n.title).join(" / ")}`;
  return parseJson<InsightResult>(await callClaude(MODELS.mid(), system, user));
}

// ===== AIF-006の部分機能: ギャップ回答の下書き =====
export async function draftAnswer(
  question: string,
  nodes: { title: string; body: string }[],
): Promise<{ title: string; body: string }> {
  if (MODE() === "fixture") return fixtureDraftAnswer(question);
  const system = `Draft an FAQ answer for the unanswered buyer question, based on existing knowledge if relevant. Respond as JSON: {"title": string, "body": string}`;
  return parseJson(await callClaude(MODELS.mid(), system, `Question: ${question}\nKnowledge: ${nodes.map((n) => `${n.title}: ${n.body}`).join("\n")}`));
}

// ===== AIF-003の翻訳基盤 =====
export async function translate(text: string, targetLang: string): Promise<string> {
  if (MODE() === "fixture") return fixtureTranslate(text, targetLang);
  const result = await callClaude(
    MODELS.light(),
    `Translate the text to "${targetLang}". Respond with the translation only.`,
    text,
  );
  return result.trim();
}

// ===== ペルソナ挨拶生成 =====
export async function generateGreeting(productName: string, tone: string): Promise<Record<string, string>> {
  if (MODE() === "fixture") return fixtureGreeting(productName);
  const system = `Write a short demo-opening greeting for an AI demo employee of "${productName}" (tone: ${tone}) in 4 languages.
Respond as JSON: {"ja": string, "en": string, "zh": string, "es": string}`;
  return parseJson(await callClaude(MODELS.mid(), system, "Generate the greeting."));
}
