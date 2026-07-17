"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch, apiPost } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { Button, EmptyState, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { formatDate, isOverdue } from "@/lib/client/format";
import type { Deal, Task } from "@/lib/client/types";

type FilterKey = "OPEN" | "DONE" | "ALL";

function AddTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [dealId, setDealId] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ stages: { deals: Deal[] }[] }>("/api/deals?view=board").then((board) =>
      setDeals(board.stages.flatMap((s) => s.deals)),
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { task } = await apiPost<{ task: Task }>("/api/tasks", {
        title,
        dueAt: dueAt || undefined,
        dealId: dealId || undefined,
      });
      onCreated(task);
      onClose();
    } catch {
      setError("タスクの作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="タスクを追加" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextInput placeholder="タイトル" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-token border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          className="rounded-token border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">ディールを選択(任意)</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Button type="submit" disabled={saving}>
          追加
        </Button>
      </form>
    </Modal>
  );
}

export default function TasksPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<FilterKey>("OPEN");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [doneAnim, setDoneAnim] = useState<Set<string>>(new Set());

  const load = useCallback((f: FilterKey) => {
    setTasks(null);
    setError(null);
    const path = f === "ALL" ? "/api/tasks" : `/api/tasks?status=${f}`;
    apiGet<{ tasks: Task[] }>(path)
      .then((res) => setTasks(res.tasks))
      .catch(() => setError("タスクの読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function handleCheck(id: string) {
    setDoneAnim((prev) => new Set(prev).add(id));
    try {
      await apiPatch(`/api/tasks/${id}`, { status: "DONE" });
      setTimeout(() => {
        setTasks((prev) => (prev ? prev.map((t) => (t.id === id ? { ...t, status: "DONE" } : t)) : prev));
        if (filter === "OPEN") {
          setTimeout(() => {
            setTasks((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
          }, 500);
        }
      }, 0);
    } catch {
      setDoneAnim((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.show("タスクの更新に失敗しました", { kind: "error" });
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">タスク</h1>
        <Button data-testid="add-task-button" onClick={() => setModalOpen(true)}>
          + タスク追加
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["OPEN", "DONE", "ALL"] as FilterKey[]).map((f) => (
          <button
            key={f}
            type="button"
            data-testid={`filter-tab-${f}`}
            onClick={() => setFilter(f)}
            className={`rounded-token px-3 py-1.5 text-sm ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-surface border border-border text-text-muted"
            }`}
          >
            {f === "OPEN" ? "未完了" : f === "DONE" ? "完了" : "すべて"}
          </button>
        ))}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!tasks && !error && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {tasks && tasks.length === 0 && <EmptyState title="タスクはありません" />}

      {tasks && tasks.length > 0 && (
        <div className="flex flex-col gap-1">
          {tasks.map((t) => {
            const isDone = t.status === "DONE" || doneAnim.has(t.id);
            return (
              <div
                key={t.id}
                data-testid={`task-row-${t.id}`}
                className="flex items-center gap-3 rounded-token px-2 py-2 text-sm hover:bg-surface-hover"
              >
                <input
                  data-testid={`task-checkbox-${t.id}`}
                  type="checkbox"
                  checked={isDone}
                  disabled={t.status === "DONE"}
                  onChange={() => t.status === "OPEN" && handleCheck(t.id)}
                  className="accent-primary"
                />
                <span className={isDone ? "flex-1 text-text-muted line-through" : "flex-1 text-text"}>{t.title}</span>
                <span>{t.source === "AI" ? "🤖" : "👤"}</span>
                {t.deal && (
                  <Link href={`/app/deals/${t.deal.id}`} className="text-primary hover:underline">
                    {t.deal.name}
                  </Link>
                )}
                <span className={isOverdue(t.dueAt) && !isDone ? "text-danger" : "text-text-muted"}>
                  {formatDate(t.dueAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AddTaskModal onClose={() => setModalOpen(false)} onCreated={(t) => setTasks((prev) => (prev ? [t, ...prev] : [t]))} />
      )}
    </div>
  );
}
