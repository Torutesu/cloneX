"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { useReviewBadge } from "@/components/app/ReviewBadgeContext";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { Button, Card, EmptyState, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { formatAmount, formatDate, isOverdue } from "@/lib/client/format";
import type { AiProposal, Activity, Board, Task } from "@/lib/client/types";

/**
 * Chat-first home hero, mirroring Octolane's real home screen ("Your move,
 * Chandrika" + composer + suggestion chips — observed in the Quivly case-study
 * photo of the logged-in app). Submitting routes into /app/chat which auto-sends
 * the message. The two chat chips use the fixture-backed phrasings so the flow
 * works end-to-end in AI_MODE=fixture; the tasks chip links straight to Tasks.
 */
function HomeHero({ name }: { name: string | null }) {
  const router = useRouter();
  const [text, setText] = useState("");

  function ask(message: string) {
    if (!message.trim()) return;
    router.push(`/app/chat?q=${encodeURIComponent(message.trim())}`);
  }

  return (
    <section className="mx-auto mb-10 mt-4 flex max-w-2xl flex-col items-center gap-4 md:mt-10">
      <h1 className="text-center text-2xl font-bold tracking-tight text-text md:text-3xl">
        {name ? `次の一手を、${name}さん` : "次の一手を"}
      </h1>
      <form
        className="flex w-full gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <TextInput
          data-testid="home-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ディールについて質問、フォローアップの作成、状況の確認…"
          className="min-h-11 shadow-sm"
        />
        <Button type="submit" data-testid="home-composer-send" className="min-h-11 shrink-0">
          送信
        </Button>
      </form>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/app/tasks")}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
        >
          今日は何をすべき?
        </button>
        <button
          type="button"
          onClick={() => ask("10日以上動いていないディールを見せて")}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
        >
          止まっているフォローアップは?
        </button>
        <button
          type="button"
          onClick={() => ask("田中太郎さんにフォローアップして")}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
        >
          フォローアップを作成
        </button>
      </div>
    </section>
  );
}

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

  const [userName, setUserName] = useState<string | null>(null);
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
    apiGet<{ user: { name: string } }>("/api/me")
      .then((res) => setUserName(res.user.name))
      .catch(() => {});
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
      <HomeHero name={userName} />

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
