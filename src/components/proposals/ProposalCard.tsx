"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ConfidenceBadge, ErrorBanner } from "@/components/ui/primitives";
import { formatAmount, formatDateTime } from "@/lib/client/format";
import type {
  AiProposal,
  Contact,
  DraftEmailPayload,
  FieldUpdatePayload,
  NewContactPayload,
  NewDealPayload,
  TaskPayload,
} from "@/lib/client/types";

const FIELD_LABEL: Record<string, string> = {
  amount: "金額",
  stageId: "ステージ",
  nextActionAt: "次アクション日",
  name: "名前",
};

function ProposalContent({ proposal, contactsById }: { proposal: AiProposal; contactsById?: Record<string, Contact> }) {
  switch (proposal.type) {
    case "NEW_DEAL": {
      const p = proposal.payload as NewDealPayload;
      return (
        <div>
          <p className="font-medium text-text">「{p.name}」 {formatAmount(p.amount, p.currency)}</p>
          <p className="text-sm text-text-muted">
            {p.contacts.map((c) => `${c.name}${c.role ? `(${c.role})` : ""}`).join(", ")} / {p.companyName} /{" "}
            {p.stageName}
          </p>
          {p.taskTitle && <p className="text-sm text-text-muted">タスク: {p.taskTitle}</p>}
          <p className="mt-1 text-xs text-text-muted">根拠: {p.reason}</p>
        </div>
      );
    }
    case "NEW_CONTACT": {
      const p = proposal.payload as NewContactPayload;
      return (
        <div>
          <p className="font-medium text-text">
            新規コンタクト: {p.name} ({p.email})
          </p>
          {p.companyName && <p className="text-sm text-text-muted">{p.companyName}</p>}
          <p className="mt-1 text-xs text-text-muted">根拠: {p.reason}</p>
        </div>
      );
    }
    case "FIELD_UPDATE": {
      const p = proposal.payload as FieldUpdatePayload;
      return (
        <div>
          <p className="font-medium text-text">
            {FIELD_LABEL[p.field] ?? p.field}: {p.oldValue ?? "未設定"} → {p.newValue}
          </p>
          <p className="mt-1 text-xs text-text-muted">根拠: {p.reason}</p>
        </div>
      );
    }
    case "DRAFT_EMAIL": {
      const p = proposal.payload as DraftEmailPayload;
      const contact = contactsById?.[p.contactId];
      return (
        <div>
          <p className="font-medium text-text">
            フォローアップ草稿: {contact ? `${contact.name} (${contact.email})` : p.contactId}
          </p>
          <p className="text-sm text-text-muted">件名: {p.subject}</p>
          <p className="whitespace-pre-wrap text-sm text-text-muted">{p.body}</p>
          <p className="mt-1 text-xs text-text-muted">根拠: {p.reason}</p>
        </div>
      );
    }
    case "TASK": {
      const p = proposal.payload as TaskPayload;
      return (
        <div>
          <p className="font-medium text-text">タスク提案: {p.title}</p>
          {p.dueAt && <p className="text-sm text-text-muted">期日: {formatDateTime(p.dueAt)}</p>}
          <p className="mt-1 text-xs text-text-muted">根拠: {p.reason}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

export function ProposalCard({
  proposal,
  variant,
  contactsById,
  onApprove,
  onReject,
  onEditApprove,
}: {
  proposal: AiProposal;
  variant: "queue" | "history" | "preview";
  contactsById?: Record<string, Contact>;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onEditApprove?: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(() => JSON.stringify(proposal.payload, null, 2));
  const [busy, setBusy] = useState<"approve" | "reject" | "edit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (!onApprove) return;
    setBusy("approve");
    setError(null);
    try {
      await onApprove(proposal.id);
    } catch {
      setError("承認に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    if (!onReject) return;
    setBusy("reject");
    setError(null);
    try {
      await onReject(proposal.id);
    } catch {
      setError("却下に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleEditApprove() {
    if (!onEditApprove) return;
    setBusy("edit");
    setError(null);
    try {
      const payload = JSON.parse(editText) as Record<string, unknown>;
      await onEditApprove(proposal.id, payload);
      setEditing(false);
    } catch {
      setError("承認に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  const isPending = proposal.status === "PENDING";

  return (
    <div
      data-testid={`proposal-card-${proposal.id}`}
      className="flex flex-col gap-2 rounded-token border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <span className="font-semibold text-text">
          🤖 {proposal.type}
          {proposal.status === "AUTO_APPROVED" && " ⚡"}
        </span>
        {!isPending && <span className="rounded-token bg-surface-hover px-2 py-0.5 font-medium">{proposal.status}</span>}
        <ConfidenceBadge confidence={proposal.confidence} testId={`confidence-badge-${proposal.id}`} />
        <span>via {proposal.sourceType === "EMAIL" ? "✉️ メール" : "💬 チャット"}</span>
      </div>

      {editing ? (
        <textarea
          className="w-full rounded-token border border-border bg-surface p-2 font-mono text-xs"
          rows={8}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
        />
      ) : (
        <ProposalContent proposal={proposal} contactsById={contactsById} />
      )}

      {proposal.sourceEmail && (
        <div>
          <button
            type="button"
            data-testid={`source-accordion-${proposal.id}`}
            onClick={() => setSourceOpen((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {sourceOpen ? "原文を閉じる ▴" : "原文を見る ▾"}
          </button>
          {sourceOpen && (
            <blockquote className="mt-1 rounded-token bg-surface-hover p-2 text-xs text-text-muted">
              {proposal.sourceEmail.bodyText}
            </blockquote>
          )}
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {isPending && variant === "queue" && (
        <div className="mt-1 flex gap-2">
          <Button data-testid={`approve-${proposal.id}`} onClick={handleApprove} disabled={busy !== null} className="max-md:min-h-11 max-md:min-w-11 text-xs">
            承認
          </Button>
          <Button
            data-testid={`reject-${proposal.id}`}
            variant="secondary"
            onClick={handleReject}
            disabled={busy !== null}
            className="max-md:min-h-11 max-md:min-w-11 text-xs"
          >
            却下
          </Button>
          {editing ? (
            <Button
              data-testid={`edit-approve-${proposal.id}`}
              variant="secondary"
              onClick={handleEditApprove}
              disabled={busy !== null}
              className="text-xs"
            >
              編集内容で承認
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setEditing(true)} className="text-xs">
              編集して承認
            </Button>
          )}
        </div>
      )}

      {isPending && variant === "preview" && (
        <div className="mt-1 flex gap-2">
          <Button data-testid={`approve-${proposal.id}`} onClick={handleApprove} disabled={busy !== null} className="max-md:min-h-11 max-md:min-w-11 text-xs">
            承認
          </Button>
          <Button
            data-testid={`reject-${proposal.id}`}
            variant="secondary"
            onClick={handleReject}
            disabled={busy !== null}
            className="max-md:min-h-11 max-md:min-w-11 text-xs"
          >
            却下
          </Button>
          <Link href="/app/review" className="text-xs text-primary hover:underline self-center">
            詳細
          </Link>
        </div>
      )}
    </div>
  );
}
