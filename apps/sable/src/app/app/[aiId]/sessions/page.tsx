"use client";

// SCR-018: セッション一覧(AI社員のホーム)
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionRow = {
  id: string;
  buyerName: string | null;
  buyerCompany: string | null;
  language: string;
  status: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  qualification: { id: string } | null;
  events: { payload: { from?: string; to?: string } }[];
};

export default function SessionsPage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const q = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/ai-employees/${aiId}/sessions${q}`).then(async (res) => {
      if (res.ok) setSessions((await res.json()).sessions);
    });
  }, [aiId, statusFilter]);

  function langLabel(s: SessionRow) {
    if (s.events.length > 0) {
      const from = s.events[0]?.payload.from;
      const to = s.events[s.events.length - 1]?.payload.to;
      return `${from}→${to}`;
    }
    return s.language;
  }

  function duration(s: SessionRow) {
    if (!s.endedAt) return "-";
    const min = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
    return `${min}分`;
  }

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">セッション</h1>
        <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">すべて</option>
          <option value="ACTIVE">進行中のみ</option>
          <option value="ENDED">終了のみ</option>
        </select>
      </div>

      {sessions === null ? (
        <div className="card h-40 animate-pulse" />
      ) : sessions.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          まだセッションがありません。配備からリンクを共有しましょう
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>買い手</th>
                <th>会社</th>
                <th>言語</th>
                <th>状態</th>
                <th>開始</th>
                <th>長さ</th>
                <th>Q</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  data-testid="session-row"
                  data-mode={s.mode}
                  className="cursor-pointer"
                  onClick={() => router.push(`/app/${aiId}/sessions/${s.id}`)}
                >
                  <td>{s.buyerName ?? "(匿名)"}</td>
                  <td>{s.buyerCompany ?? "-"}</td>
                  <td>{langLabel(s)}</td>
                  <td>
                    {s.status === "ACTIVE" ? (
                      <span className="badge badge-success">● 進行中</span>
                    ) : (
                      <span className="badge badge-muted">ENDED</span>
                    )}
                  </td>
                  <td>{new Date(s.startedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{duration(s)}</td>
                  <td>{s.qualification ? "✓" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
