"use client";

// SCR-020: インサイトダッシュボード
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = { sessionCount: number; avgDurationSec: number; questionCount: number; openGapCount: number };
type Report = {
  generatedAt: string;
  payload: {
    topQuestions: { question: string; count: number; answered: boolean; gapId?: string }[];
    suggestions: string[];
  };
};

export default function InsightsPage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/ai-employees/${aiId}/insights`);
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
      setReport(data.report);
    }
  }, [aiId]);

  useEffect(() => {
    load();
  }, [load]);

  async function regenerate() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/ai-employees/${aiId}/insights`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
      setReport(data.report);
    } else {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">インサイト</h1>
        <button data-testid="regenerate-insights" className="btn btn-primary" onClick={regenerate} disabled={busy}>
          {busy ? "生成中…" : "🔄 再生成"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatTile testId="stat-sessions" label="セッション数" value={String(stats.sessionCount)} />
          <StatTile testId="stat-duration" label="平均時間" value={stats.avgDurationSec > 0 ? `${Math.round(stats.avgDurationSec / 60)}分` : "-"} />
          <StatTile testId="stat-questions" label="買い手質問数" value={String(stats.questionCount)} />
          <StatTile testId="stat-gaps" label="未解決ギャップ" value={String(stats.openGapCount)} />
        </div>
      )}

      {error && (
        <div className="card p-4 text-sm" style={{ color: "var(--brand-danger)" }}>
          インサイトを生成できませんでした <button className="underline" onClick={regenerate}>再試行</button>
        </div>
      )}

      {stats?.sessionCount === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          セッションが集まるとインサイトが表示されます
        </div>
      ) : report ? (
        <>
          <section data-testid="top-questions" className="card space-y-2 p-5">
            <h2 className="text-sm font-bold" style={{ color: "var(--brand-text-muted)" }}>
              ■ 頻出質問トップ{report.payload.topQuestions.length}
            </h2>
            {report.payload.topQuestions.map((q, i) => (
              <div
                key={i}
                data-testid="tq-row"
                data-answered={String(q.answered)}
                data-question={q.question}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {i + 1}. {q.question}({q.count}回)
                  {q.answered ? (
                    <span className="ml-1" style={{ color: "var(--brand-success)" }}>✓回答済</span>
                  ) : (
                    <span className="ml-1" style={{ color: "var(--brand-warning)" }}>⚠未回答</span>
                  )}
                </span>
                {!q.answered && (
                  <button
                    data-testid="create-answer"
                    className="btn btn-secondary"
                    onClick={() =>
                      router.push(
                        `/app/${aiId}/brain/knowledge?gap=${q.gapId ?? ""}&q=${encodeURIComponent(q.question)}`,
                      )
                    }
                  >
                    回答を作成
                  </button>
                )}
              </div>
            ))}
          </section>

          <section className="card space-y-1.5 p-5">
            <h2 className="text-sm font-bold" style={{ color: "var(--brand-text-muted)" }}>
              ■ 改善提案
            </h2>
            {report.payload.suggestions.map((s, i) => (
              <p key={i} className="text-sm">・{s}</p>
            ))}
            <p className="pt-1 text-xs" style={{ color: "var(--brand-text-muted)" }}>
              最終生成: {new Date(report.generatedAt).toLocaleString("ja-JP")}
            </p>
          </section>
        </>
      ) : (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          [再生成]を押すとレポートを作成します
        </div>
      )}
    </main>
  );
}

function StatTile({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs" style={{ color: "var(--brand-text-muted)" }}>{label}</p>
      <p data-testid={testId} className="text-2xl font-bold">{value}</p>
    </div>
  );
}
