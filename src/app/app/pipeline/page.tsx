"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { Button, EmptyState, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { formatAmount, formatDate } from "@/lib/client/format";
import type { Board, BoardStage, Company, Contact, Deal } from "@/lib/client/types";

function DealCard({
  deal,
  celebrating,
  onDragStart,
}: {
  deal: Deal;
  celebrating: boolean;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
}) {
  const router = useRouter();
  return (
    <div
      data-testid={`deal-card-${deal.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => router.push(`/app/deals/${deal.id}`)}
      className={`cursor-pointer rounded-token border border-border bg-surface p-3 shadow-sm transition-all hover:shadow-md ${
        celebrating ? "ring-2 ring-success" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">{deal.name}</p>
        {celebrating && <span aria-hidden="true">🎉</span>}
        {deal.stuck && !celebrating && <span title="10日以上更新なし">⚠️</span>}
      </div>
      {deal.company && <p className="text-xs text-text-muted">{deal.company.name}</p>}
      <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
        <span>{formatAmount(deal.amount, deal.currency)}</span>
        <span>{formatDate(deal.updatedAt)}</span>
      </div>
    </div>
  );
}

function AddDealModal({
  stageId,
  onClose,
  onCreated,
}: {
  stageId: string;
  onClose: () => void;
  onCreated: (deal: Deal) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ companies: Company[] }>("/api/companies").then((r) => setCompanies(r.companies));
    apiGet<{ contacts: Contact[] }>("/api/contacts").then((r) => setContacts(r.contacts));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { deal } = await apiPost<{ deal: Deal }>("/api/deals", {
        name,
        stageId,
        amount: amount ? Number(amount) : undefined,
        companyId: companyId || undefined,
        contactIds: contactIds.length ? contactIds : undefined,
      });
      onCreated(deal);
      onClose();
    } catch {
      setError("ディールの作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="ディールを追加" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextInput placeholder="ディール名" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput
          placeholder="金額"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-token border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">企業を選択(任意)</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {contacts.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded-token border border-border p-2 text-sm">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  checked={contactIds.includes(c.id)}
                  onChange={(e) =>
                    setContactIds((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Button type="submit" disabled={saving}>
          追加
        </Button>
      </form>
    </Modal>
  );
}

export default function PipelinePage() {
  const toast = useToast();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalStageId, setModalStageId] = useState<string | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const draggedDealId = useRef<string | null>(null);
  const hashScrolled = useRef(false);

  const load = useCallback(() => {
    setBoard(null);
    setError(null);
    apiGet<Board>("/api/deals?view=board")
      .then(setBoard)
      .catch(() => setError("パイプラインの読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!board || hashScrolled.current) return;
    const hash = decodeURIComponent(window.location.hash.replace("#", ""));
    if (hash) {
      document.getElementById(`stage-${hash}`)?.scrollIntoView({ behavior: "smooth", inline: "center" });
      hashScrolled.current = true;
    }
  }, [board]);

  function handleDragStart(e: React.DragEvent, dealId: string) {
    draggedDealId.current = dealId;
    e.dataTransfer.setData("text/plain", dealId);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(e: React.DragEvent, targetStage: BoardStage["stage"]) {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain") || draggedDealId.current;
    draggedDealId.current = null;
    if (!dealId || !board) return;

    const sourceEntry = board.stages.find((s) => s.deals.some((d) => d.id === dealId));
    const deal = sourceEntry?.deals.find((d) => d.id === dealId);
    if (!deal || !sourceEntry || sourceEntry.stage.id === targetStage.id) return;

    const prevBoard = board;
    // Optimistic move.
    setBoard({
      stages: board.stages.map((s) => {
        if (s.stage.id === sourceEntry.stage.id) {
          return { ...s, deals: s.deals.filter((d) => d.id !== dealId) };
        }
        if (s.stage.id === targetStage.id) {
          return { ...s, deals: [{ ...deal, stageId: targetStage.id }, ...s.deals] };
        }
        return s;
      }),
    });

    if (targetStage.isWon) {
      setCelebratingId(dealId);
      setTimeout(() => setCelebratingId(null), 1000);
    }

    try {
      await apiPatch(`/api/deals/${dealId}`, { stageId: targetStage.id });
    } catch {
      setBoard(prevBoard);
      toast.show("ステージの移動に失敗しました", { kind: "error" });
    }
  }

  const totalDeals = board?.stages.reduce((sum, s) => sum + s.deals.length, 0) ?? null;

  return (
    <div className="flex h-screen flex-col p-8">
      <h1 className="mb-4 text-xl font-bold text-text">パイプライン</h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
          <Button variant="secondary" onClick={load} className="mt-2 text-xs">
            再読み込み
          </Button>
        </div>
      )}

      {!board && !error && (
        <div className="flex gap-4 overflow-x-auto">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-64 shrink-0" />
          ))}
        </div>
      )}

      {board && totalDeals === 0 && (
        <EmptyState
          title="ディールがありません。メールを取り込むかチャットで作成してください"
          action={
            <a href="/app/review" className="text-sm text-primary hover:underline">
              Reviewへ
            </a>
          }
        />
      )}

      {board && totalDeals !== 0 && (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {board.stages.map(({ stage, deals, totalAmount }) => (
            <div
              key={stage.id}
              id={`stage-${stage.name}`}
              data-testid={`stage-column-${stage.name}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => handleDrop(e, stage)}
              className="flex w-64 shrink-0 flex-col rounded-token border border-border bg-surface-hover/40 p-2"
            >
              <div className="mb-2 px-1">
                <p className="text-sm font-semibold text-text">{stage.name}</p>
                <p className="text-xs text-text-muted">
                  {deals.length}件 / {formatAmount(totalAmount)}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {deals.map((d) => (
                  <DealCard key={d.id} deal={d} celebrating={celebratingId === d.id} onDragStart={handleDragStart} />
                ))}
              </div>
              <Button
                data-testid="add-deal-button"
                variant="ghost"
                className="mt-2 w-full justify-start text-xs"
                onClick={() => setModalStageId(stage.id)}
              >
                + ディール追加
              </Button>
            </div>
          ))}
        </div>
      )}

      {modalStageId && (
        <AddDealModal
          stageId={modalStageId}
          onClose={() => setModalStageId(null)}
          onCreated={(deal) => {
            setBoard((prev) =>
              prev
                ? {
                    stages: prev.stages.map((s) =>
                      s.stage.id === deal.stageId ? { ...s, deals: [...s.deals, deal] } : s,
                    ),
                  }
                : prev,
            );
          }}
        />
      )}
    </div>
  );
}
