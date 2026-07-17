"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { useReviewBadge } from "@/components/app/ReviewBadgeContext";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { Button, Card, EmptyState, ErrorBanner, Skeleton } from "@/components/ui/primitives";
import { formatAmount, formatDate, isOverdue } from "@/lib/client/format";
import type { AiProposal, Activity, Board, Task } from "@/lib/client/types";

function SectionShell({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <ErrorBanner>{error}</ErrorBanner>
        <Button variant="secondary" onClick={onRetry} className="self-start text-xs">
          再読み込み
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { refresh: refreshBadge } = useReviewBadge();

  const [proposals, setProposals] = useState<AiProposal[] | null>(null);
  const [proposalsError, setProposalsError] = useState<string | null>(null);

  const [board, setBoard] = useState<Board | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const loadProposals = useCallback(() => {
    setProposals(null);
    setProposalsError(null);
    apiGet<{ proposals: AiProposal[] }>("/api/proposals?status=PENDING")
      .then((res) => setProposals(res.proposals.slice(0, 5)))
      .catch(() => setProposalsError("提案の読み込みに失敗しました"));
  }, []);

  const loadBoard = useCallback(() => {
    setBoard(null);
    setBoardError(null);
    apiGet<Board>("/api/deals?view=board")
      .then(setBoard)
      .catch(() => setBoardError("パイプラインの読み込みに失敗しました"));
  }, []);

  const loadTasks = useCallback(() => {
    setTasks(null);
    setTasksError(null);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    apiGet<{ tasks: Task[] }>(`/api/tasks?status=OPEN&dueBefore=${today.toISOString()}`)
      .then((res) => setTasks(res.tasks.slice(0, 5)))
      .catch(() => setTasksError("タスクの読み込みに失敗しました"));
  }, []);

  const loadActivities = useCallback(() => {
    setActivities(null);
    setActivitiesError(null);
    apiGet<{ activities: Activity[] }>("/api/activities?limit=10")
      .then((res) => setActivities(res.activities))
      .catch(() => setActivitiesError("アクティビティの読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    loadProposals();
    loadBoard();
    loadTasks();
    loadActivities();
  }, [loadProposals, loadBoard, loadTasks, loadActivities]);

  async function handleApprove(id: string) {
    const { created } = await apiPost<{ proposal: AiProposal; created: { dealId?: string } }>(
      `/api/proposals/${id}/approve`,
    );
    setProposals((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    refreshBadge();
    toast.show("提案を承認しました", {
      action: created.dealId ? { label: "開く", onClick: () => router.push(`/app/deals/${created.dealId}`) } : undefined,
    });
  }

  async function handleReject(id: string) {
    await apiPost(`/api/proposals/${id}/reject`);
    setProposals((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    refreshBadge();
    toast.show("提案を却下しました", { kind: "info" });
  }

  async function handleTaskCheck(id: string) {
    const prev = tasks;
    setTasks((cur) => (cur ? cur.filter((t) => t.id !== id) : cur));
    try {
      await apiPatch(`/api/tasks/${id}`, { status: "DONE" });
    } catch {
      setTasks(prev ?? null);
      toast.show("タスクの更新に失敗しました", { kind: "error" });
    }
  }

  const noProposalsAtAll = proposals !== null && proposals.length === 0;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-6 text-xl font-bold text-text">ダッシュボード</h1>

      {noProposalsAtAll ? (
        <div className="mb-8">
          <EmptyState
            title="受信箱は空です。メールが届くとAIが提案を作ります"
            action={
              <Link href="/app/settings">
                <Button className="text-sm">メールを取り込む</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">要承認 ({proposals?.length ?? 0})</h2>
          <SectionShell loading={proposals === null && !proposalsError} error={proposalsError} onRetry={loadProposals}>
            <div data-testid="proposal-preview-list" className="flex flex-col gap-3">
              {(proposals ?? []).map((p) => (
                <ProposalCard key={p.id} proposal={p} variant="preview" onApprove={handleApprove} onReject={handleReject} />
              ))}
              <Link href="/app/review" className="text-sm text-primary hover:underline">
                すべて見る →
              </Link>
            </div>
          </SectionShell>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-muted">パイプライン概況</h2>
          <SectionShell loading={board === null && !boardError} error={boardError} onRetry={loadBoard}>
            <Card data-testid="pipeline-summary" className="flex flex-col gap-2">
              {(board?.stages ?? []).map(({ stage, deals, totalAmount }) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => router.push(`/app/pipeline#${stage.name}`)}
                  className="flex items-center justify-between gap-2 rounded-token px-2 py-1.5 text-sm hover:bg-surface-hover"
                >
                  <span className="min-w-0 truncate text-text">{stage.name}</span>
                  <span className="shrink-0 text-text-muted">
                    {deals.length}件 / {formatAmount(totalAmount)}
                  </span>
                </button>
              ))}
            </Card>
          </SectionShell>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-muted">今日のタスク</h2>
          <SectionShell loading={tasks === null && !tasksError} error={tasksError} onRetry={loadTasks}>
            <Card data-testid="today-tasks" className="flex flex-col gap-2">
              {(tasks ?? []).length === 0 && <p className="text-sm text-text-muted">タスクはありません</p>}
              {(tasks ?? []).map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" onChange={() => handleTaskCheck(t.id)} className="shrink-0 accent-primary" />
                  <span className="min-w-0 flex-1 truncate text-text">{t.title}</span>
                  {t.deal && (
                    <Link href={`/app/deals/${t.deal.id}`} className="shrink-0 truncate text-primary hover:underline">
                      {t.deal.name}
                    </Link>
                  )}
                  <span className={`shrink-0 ${isOverdue(t.dueAt) ? "text-danger" : "text-text-muted"}`}>{formatDate(t.dueAt)}</span>
                </label>
              ))}
            </Card>
          </SectionShell>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">最近のアクティビティ</h2>
        <SectionShell loading={activities === null && !activitiesError} error={activitiesError} onRetry={loadActivities}>
          <Card data-testid="recent-activity" className="flex flex-col gap-2">
            {(activities ?? []).length === 0 && <p className="text-sm text-text-muted">アクティビティはありません</p>}
            {(activities ?? []).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-text-muted">
                <span className="shrink-0">{formatDate(a.occurredAt)}</span>
                <span className="min-w-0 truncate text-text">{a.summary}</span>
              </div>
            ))}
          </Card>
        </SectionShell>
      </section>
    </div>
  );
}
