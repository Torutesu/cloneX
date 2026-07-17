"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client/api";
import { Button, TextInput } from "@/components/ui/primitives";
import { formatAmount, formatDateTime } from "@/lib/client/format";
import type { ChatMessage } from "@/lib/client/types";

// Forward-looking contract for Phase 3 (AIF-002/003) — see
// pipeline/octolane/build-notes.md and fixtures/ai/chat-patterns.json. In Phase 2
// (this build), src/lib/ai/client.ts's completeChatFixture always returns
// `{ calls: [], error: true }`, so `dealRefs`/`draft` never populate yet — the UI is
// wired to render them once Phase 3 fills them in.
type ChatToolCallsPayload = {
  calls?: string[];
  error?: boolean;
  dealRefs?: { id: string; name: string; stageName?: string; amount?: number | null; updatedAt?: string }[];
  draft?: {
    dealId?: string;
    contactId: string;
    contactName: string;
    subject: string;
    body: string;
    reason?: string;
  };
};

const SAMPLE_PROMPTS = ["動いていないディールは?", "今週のタスクは?", "田中太郎さんにフォローアップして"];
const COMMANDS = [
  { cmd: "/deals", template: "/deals " },
  { cmd: "/contacts", template: "/contacts " },
  { cmd: "/tasks", template: "/tasks " },
  { cmd: "/followup", template: "/followup (名前)にフォローアップして" },
];

function DealRefCard({ ref }: { ref: NonNullable<ChatToolCallsPayload["dealRefs"]>[number] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-testid={`deal-ref-card-${ref.id}`}
      onClick={() => router.push(`/app/deals/${ref.id}`)}
      className="block w-full rounded-token border border-border bg-surface p-3 text-left text-sm hover:bg-surface-hover"
    >
      <p className="font-medium text-text">{ref.name}</p>
      <p className="text-xs text-text-muted">
        {ref.stageName} / {formatAmount(ref.amount)} / 最終更新 {ref.updatedAt ? formatDateTime(ref.updatedAt) : "-"}
      </p>
    </button>
  );
}

function DraftPreviewCard({ draft }: { draft: NonNullable<ChatToolCallsPayload["draft"]> }) {
  const [added, setAdded] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAddToReview() {
    setSaving(true);
    try {
      await apiPost("/api/proposals", {
        type: "DRAFT_EMAIL",
        payload: {
          dealId: draft.dealId,
          contactId: draft.contactId,
          subject: draft.subject,
          body: draft.body,
          reason: draft.reason ?? "チャット指示によるフォローアップ草稿",
        },
        sourceType: "CHAT",
        confidence: 0.8,
      });
      setAdded(true);
    } finally {
      setSaving(false);
    }
  }

  if (discarded) return null;

  return (
    <div data-testid="draft-preview-card" className="rounded-token border border-border bg-surface p-3 text-sm">
      <p className="mb-1 text-xs font-semibold text-text-muted">フォローアップ草稿</p>
      <p className="text-text">宛先: {draft.contactName}</p>
      <p className="text-text">件名: {draft.subject}</p>
      <p className="whitespace-pre-wrap text-text-muted">{draft.body}</p>
      {added ? (
        <p className="mt-2 text-xs text-success">承認キューに追加しました</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button data-testid="add-to-review-button" onClick={handleAddToReview} disabled={saving} className="text-xs">
            承認キューに入れる
          </Button>
          <Button variant="secondary" onClick={() => setDiscarded(true)} className="text-xs">
            破棄
          </Button>
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const payload = (message.toolCalls ?? {}) as ChatToolCallsPayload;
  return (
    <div className="flex flex-col gap-2 rounded-token bg-surface-hover px-3 py-2 text-sm">
      {payload.error ? (
        <div className="flex items-center gap-2">
          <span className="text-danger">応答を生成できませんでした</span>
          <button type="button" onClick={onRetry} className="text-primary hover:underline">
            再試行
          </button>
        </div>
      ) : (
        <p className="text-text">{message.content}</p>
      )}
      {!!payload.calls?.length && (
        <div className="flex flex-col gap-0.5">
          {payload.calls.map((c, i) => (
            <span key={i} className="text-xs text-text-muted">
              🔍 {c} を実行
            </span>
          ))}
        </div>
      )}
      {payload.dealRefs?.map((ref) => (
        <DealRefCard key={ref.id} ref={ref} />
      ))}
      {payload.draft && <DraftPreviewCard draft={payload.draft} />}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<{ messages: ChatMessage[] }>("/api/chat/messages").then((res) => setMessages(res.messages));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    setInput("");
    try {
      const { userMessage, assistantMessage } = await apiPost<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        "/api/chat",
        { content },
      );
      setMessages((prev) => [...(prev ?? []), userMessage, assistantMessage]);
    } finally {
      setSending(false);
    }
  }

  function handleInputChange(value: string) {
    setInput(value);
    setShowPalette(value.startsWith("/") && value.length <= 12);
  }

  return (
    <div className="flex h-screen flex-col p-4 md:p-8">
      <h1 className="mb-4 text-xl font-bold text-text">チャット</h1>

      <div data-testid="chat-message-list" ref={listRef} className="flex-1 overflow-y-auto rounded-token border border-border bg-surface p-4">
        {messages === null && <p className="text-sm text-text-muted">読み込み中…</p>}

        {messages !== null && messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm text-text-muted">質問や指示を入力してみましょう</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-token border border-border bg-surface-hover px-3 py-1.5 text-xs text-text hover:bg-surface"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {(messages ?? []).map((m, i) =>
            m.role === "USER" ? (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-token bg-primary px-3 py-2 text-sm break-words text-primary-foreground md:max-w-md"
              >
                {m.content}
              </div>
            ) : (
              <div key={m.id} className="max-w-[85%] md:max-w-md">
                <AssistantBubble
                  message={m}
                  onRetry={() => {
                    const prevUser = (messages ?? [])[i - 1];
                    if (prevUser?.role === "USER") send(prevUser.content);
                  }}
                />
              </div>
            ),
          )}
          {sending && (
            <div className="max-w-[85%] rounded-token bg-surface-hover px-3 py-2 text-sm text-text-muted md:max-w-md">…</div>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex gap-2">
        {showPalette && (
          <div className="absolute bottom-full mb-1 w-64 max-w-[calc(100vw-2rem)] rounded-token border border-border bg-surface p-1 shadow-lg">
            {COMMANDS.map((c) => (
              <button
                key={c.cmd}
                type="button"
                onClick={() => {
                  setInput(c.template);
                  setShowPalette(false);
                }}
                className="block min-h-11 w-full rounded-token px-2 py-1 text-left text-sm hover:bg-surface-hover"
              >
                {c.cmd}
              </button>
            ))}
          </div>
        )}
        <TextInput
          data-testid="chat-input"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="質問や指示を入力 (/ でコマンド)"
          className="min-h-11"
        />
        <Button data-testid="chat-send-button" onClick={() => send(input)} disabled={sending} className="min-h-11 min-w-11">
          送信
        </Button>
      </div>
    </div>
  );
}
