"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { useReviewBadge } from "@/components/app/ReviewBadgeContext";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/primitives";
import type { AiProposal, Contact, ProposalType } from "@/lib/client/types";
import type { DraftEmailPayload, NewContactPayload, NewDealPayload, TaskPayload } from "@/lib/client/types";

const TYPE_TABS: { key: "ALL" | ProposalType; label: string }[] = [
  { key: "ALL", label: "全て" },
  { key: "NEW_DEAL", label: "新規ディール" },
  { key: "NEW_CONTACT", label: "コンタクト" },
  { key: "FIELD_UPDATE", label: "更新" },
  { key: "DRAFT_EMAIL", label: "草稿" },
  { key: "TASK", label: "タスク" },
];

// SCR-010 success state: "承認/却下→カードが緑フラッシュして履歴へ移動" — resolved
// cards are pulled out of the pending queue immediately, then (re-)inserted into the
// history section after a short delay so the move genuinely animates rather than the
// card just teleporting in place.
const HISTORY_INSERT_DELAY_MS = 700;

function successMessage(proposal: AiProposal): string {
  switch (proposal.type) {
    case "NEW_DEAL":
      return `ディール『${(proposal.payload as NewDealPayload).name}』を作成しました`;
    case "NEW_CONTACT":
      return `コンタクト『${(proposal.payload as NewContactPayload).name}』を作成しました`;
    case "FIELD_UPDATE":
      return "ディールを更新しました";
    case "DRAFT_EMAIL":
      return `フォローアップを送信しました: ${(proposal.payload as DraftEmailPayload).subject}`;
    case "TASK":
      return `タスク『${(proposal.payload as TaskPayload).title}』を作成しました`;
    default:
      return "提案を承認しました";
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const toast = useToast();
  const { refresh: refreshBadge } = useReviewBadge();

  const [filterType, setFilterType] = useState<"ALL" | ProposalType>("ALL");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<AiProposal[]>([]);
  const [history, setHistory] = useState<AiProposal[]>([]);
  const [contactsById, setContactsById] = useState<Record<string, Contact>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (type: "ALL" | ProposalType) => {
    setError(null);
    try {
      const path = type === "ALL" ? "/api/proposals" : `/api/proposals?type=${type}`;
      const [{ proposals }, { contacts }] = await Promise.all([
        apiGet<{ proposals: AiProposal[] }>(path),
        apiGet<{ contacts: Contact[] }>("/api/contacts"),
      ]);
      setPending(proposals.filter((p) => p.status === "PENDING"));
      setHistory(proposals.filter((p) => p.status !== "PENDING").slice(0, 20));
      setContactsById(Object.fromEntries(contacts.map((c) => [c.id, c])));
    } catch {
      setError("提案の読み込みに失敗しました");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setLoaded(false);
    load(filterType);
  }, [filterType, load]);

  /** Removes from the pending queue immediately, inserts into history shortly after. */
  function moveToHistory(updated: AiProposal, sourceEmail: AiProposal["sourceEmail"]) {
    setPending((prev) => prev.filter((p) => p.id !== updated.id));
    setTimeout(() => {
      setHistory((prev) => [{ ...updated, sourceEmail }, ...prev].slice(0, 20));
    }, HISTORY_INSERT_DELAY_MS);
  }

  async function handleApprove(id: string) {
    const proposal = pending.find((p) => p.id === id);
    const { proposal: updated, created } = await apiPost<{ proposal: AiProposal; created: { dealId?: string } }>(
      `/api/proposals/${id}/approve`,
    );
    moveToHistory(updated, proposal?.sourceEmail);
    refreshBadge();
    if (proposal) {
      toast.show(successMessage(proposal), {
        action: created.dealId ? { label: "開く", onClick: () => router.push(`/app/deals/${created.dealId}`) } : undefined,
      });
    }
  }

  async function handleEditApprove(id: string, payload: Record<string, unknown>) {
    const proposal = pending.find((p) => p.id === id);
    const { proposal: updated, created } = await apiPost<{ proposal: AiProposal; created: { dealId?: string } }>(
      `/api/proposals/${id}/approve`,
      { payload },
    );
    moveToHistory(updated, proposal?.sourceEmail);
    refreshBadge();
    toast.show("編集内容で承認しました", {
      action: created.dealId ? { label: "開く", onClick: () => router.push(`/app/deals/${created.dealId}`) } : undefined,
    });
  }

  async function handleReject(id: string) {
    const proposal = pending.find((p) => p.id === id);
    const { proposal: updated } = await apiPost<{ proposal: AiProposal }>(`/api/proposals/${id}/reject`);
    moveToHistory(updated, proposal?.sourceEmail);
    refreshBadge();
    toast.show("提案を却下しました", { kind: "info" });
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-xl font-bold text-text">承認キュー</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`filter-tab-${tab.key}`}
            onClick={() => setFilterType(tab.key)}
            className={`rounded-token px-3 py-1.5 text-sm ${
              filterType === tab.key ? "bg-primary text-primary-foreground" : "bg-surface border border-border text-text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {!loaded && !error && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {loaded && pending.length === 0 && <EmptyState title="レビュー待ちの提案はありません 🎉" />}

      {loaded && pending.length > 0 && (
        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              variant="queue"
              contactsById={contactsById}
              onApprove={handleApprove}
              onReject={handleReject}
              onEditApprove={handleEditApprove}
            />
          ))}
        </div>
      )}

      {loaded && (
        <div data-testid="history-section" className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">履歴(直近20件)</h2>
          <div className="flex flex-col gap-2">
            {history.map((p) => (
              <ProposalCard key={p.id} proposal={p} variant="history" contactsById={contactsById} />
            ))}
            {history.length === 0 && <p className="text-sm text-text-muted">履歴はまだありません</p>}
          </div>
        </div>
      )}
    </div>
  );
}
