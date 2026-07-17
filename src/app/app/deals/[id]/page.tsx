"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiPost } from "@/lib/client/api";
import { Button, Card, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { activityIcon, formatDate, formatDateTime, isOverdue } from "@/lib/client/format";
import type { Activity, Board, Deal, DealContactLink, Note, Stage, Task } from "@/lib/client/types";

type DealDetailResponse = {
  deal: Deal;
  stage: Stage;
  company: Deal["company"];
  contacts: DealContactLink[];
  activities: Activity[];
  tasks: Task[];
  notes: Note[];
  pendingProposalCount: number;
};

function DealNameField({
  dealId,
  initialName,
  onSaved,
}: {
  dealId: string;
  initialName: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [display, setDisplay] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    if (!value.trim() || value === display) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/api/deals/${dealId}`, { name: value });
      setDisplay(value);
      onSaved();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <div data-testid="deal-name" onClick={() => !editing && setEditing(true)} className="cursor-text">
      {editing ? (
        <input
          autoFocus
          defaultValue={display}
          disabled={saving}
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save((e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full rounded-token border border-border bg-surface px-2 py-1 text-xl font-bold text-text"
        />
      ) : (
        <h1 className="truncate text-xl font-bold text-text">{display}</h1>
      )}
    </div>
  );
}

function DealAmountField({
  dealId,
  initialAmount,
  currency,
  onSaved,
}: {
  dealId: string;
  initialAmount: number | null;
  currency: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // Deliberately initialized once (lazy) and never re-synced from props: right after
  // a save we show exactly what the user typed (no thousands separator); the
  // formatted `toLocaleString` view only reappears on the next fresh page load,
  // which reads `initialAmount` fresh via a new component mount.
  const [display, setDisplay] = useState(() => (initialAmount != null ? initialAmount.toLocaleString("en-US") : "未設定"));
  const [saving, setSaving] = useState(false);

  async function save(raw: string) {
    const parsed = raw.trim() === "" ? null : Number(raw);
    setSaving(true);
    try {
      await apiPatch(`/api/deals/${dealId}`, { amount: parsed });
      setDisplay(raw.trim() === "" ? "未設定" : raw.trim());
      onSaved();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <div data-testid="deal-amount" onClick={() => !editing && setEditing(true)} className="cursor-text">
      {editing ? (
        <input
          autoFocus
          type="number"
          defaultValue={initialAmount ?? ""}
          disabled={saving}
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save((e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-32 rounded-token border border-border bg-surface px-2 py-1 text-sm text-text"
        />
      ) : (
        <span className="text-sm text-text">
          {currency === "USD" ? "$" : ""}
          {display}
        </span>
      )}
    </div>
  );
}

function TimelineItem({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = activity.type === "EMAIL" && !!activity.emailBody;
  return (
    <div
      data-testid={`timeline-item-${activity.id}`}
      onClick={() => expandable && setExpanded((v) => !v)}
      className={`flex gap-2 border-b border-border py-2 text-sm ${expandable ? "cursor-pointer" : ""}`}
    >
      <span aria-hidden="true">{activityIcon(activity.type)}</span>
      <div className="flex-1">
        <p className="text-text">{activity.summary}</p>
        <p className="text-xs text-text-muted">{formatDateTime(activity.occurredAt)}</p>
        {expandable && expanded && (
          <blockquote className="mt-1 whitespace-pre-wrap rounded-token bg-surface-hover p-2 text-xs text-text-muted">
            {activity.emailBody}
          </blockquote>
        )}
      </div>
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dealId = params.id;

  const [data, setData] = useState<DealDetailResponse | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [notesOpen, setNotesOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  const reload = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet<DealDetailResponse>(`/api/deals/${dealId}`);
      setData(res);
    } catch {
      setNotFound(true);
    }
  }, [dealId]);

  useEffect(() => {
    reload();
    apiGet<Board>("/api/deals?view=board")
      .then((board) => setStages(board.stages.map((s) => s.stage)))
      .catch(() => {});
  }, [reload]);

  async function handleStageChange(stageId: string) {
    try {
      await apiPatch(`/api/deals/${dealId}`, { stageId });
      await reload();
    } catch {
      setError("ステージの変更に失敗しました");
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    await apiPost("/api/notes", { dealId, body: noteBody });
    setNoteBody("");
    await reload();
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await apiPost("/api/tasks", { title: taskTitle, dueAt: taskDueAt || undefined, dealId });
    setTaskTitle("");
    setTaskDueAt("");
    await reload();
  }

  async function handleTaskCheck(id: string) {
    await apiPatch(`/api/tasks/${id}`, { status: "DONE" });
    await reload();
  }

  if (notFound) {
    return (
      <div className="p-8">
        <ErrorBanner>ディールが見つかりません</ErrorBanner>
        <Link href="/app/pipeline" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← パイプラインへ戻る
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const { deal, contacts, activities, tasks, notes, pendingProposalCount, company } = data;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {pendingProposalCount > 0 && (
        <div data-testid="pending-proposal-banner" className="mb-4 rounded-token bg-warning/15 px-4 py-3 text-sm text-text">
          AIの提案が{pendingProposalCount}件あります →{" "}
          <Link href="/app/review" className="font-medium text-primary hover:underline">
            Review
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-6">
        <div className="min-w-0 w-full flex-1 md:w-auto">
          <DealNameField dealId={deal.id} initialName={deal.name} onSaved={reload} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DealAmountField dealId={deal.id} initialAmount={deal.amount} currency={deal.currency} onSaved={reload} />
            <select
              data-testid="deal-stage-select"
              value={deal.stageId}
              onChange={(e) => handleStageChange(e.target.value)}
              className="rounded-token border border-border bg-surface px-2 py-1 text-sm text-text"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Card className="w-full shrink-0 md:w-56">
          <p className="mb-2 text-xs font-semibold text-text-muted">関係者</p>
          <div className="flex flex-wrap gap-1">
            {contacts.map((c) => (
              <Link
                key={c.contactId}
                href={`/app/contacts/${c.contactId}`}
                className="rounded-token bg-surface-hover px-2 py-1 text-xs text-text hover:underline"
              >
                {c.contact.name}
                {c.role ? ` (${c.role})` : ""}
              </Link>
            ))}
          </div>
          {company && (
            <Link
              href={`/app/companies/${company.id}`}
              className="mt-2 block text-xs text-primary hover:underline"
            >
              🏢 {company.name}
            </Link>
          )}
        </Card>
      </div>

      <div data-testid="timeline" className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-text-muted">タイムライン</h2>
        {activities.length === 0 && <p className="text-sm text-text-muted">まだ活動がありません</p>}
        {activities.map((a) => (
          <TimelineItem key={a.id} activity={a} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div data-testid="task-tab" className="rounded-token border border-border bg-surface p-3">
          <button
            type="button"
            onClick={() => setTasksOpen((v) => !v)}
            className="w-full text-left text-sm font-semibold text-text"
          >
            タスク ({tasks.filter((t) => t.status === "OPEN").length})
          </button>
          {tasksOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {tasks.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={t.status === "DONE"}
                    onChange={() => t.status === "OPEN" && handleTaskCheck(t.id)}
                    className="accent-primary"
                  />
                  <span className={t.status === "DONE" ? "flex-1 text-text-muted line-through" : "flex-1 text-text"}>
                    {t.title}
                  </span>
                  <span className={isOverdue(t.dueAt) ? "text-danger" : "text-text-muted"}>{formatDate(t.dueAt)}</span>
                </label>
              ))}
              <form onSubmit={handleAddTask} className="mt-2 flex gap-2">
                <TextInput
                  placeholder="新しいタスク"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <input
                  type="date"
                  value={taskDueAt}
                  onChange={(e) => setTaskDueAt(e.target.value)}
                  className="rounded-token border border-border bg-surface px-2 py-1 text-sm"
                />
                <Button type="submit" className="text-xs">
                  追加
                </Button>
              </form>
            </div>
          )}
        </div>

        <div data-testid="note-tab" className="rounded-token border border-border bg-surface p-3">
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className="w-full text-left text-sm font-semibold text-text"
          >
            ノート ({notes.length})
          </button>
          {notesOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-token bg-surface-hover p-2 text-sm text-text">
                  <p>{n.body}</p>
                  <p className="text-xs text-text-muted">{formatDateTime(n.createdAt)}</p>
                </div>
              ))}
              <form onSubmit={handleAddNote} className="mt-2 flex gap-2">
                <TextInput
                  data-testid="note-input"
                  placeholder="ノートを追加"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <Button data-testid="add-note-button" type="submit" className="text-xs">
                  追加
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <Button variant="ghost" className="mt-6 text-xs" onClick={() => router.push("/app/pipeline")}>
        ← パイプラインへ戻る
      </Button>
    </div>
  );
}
