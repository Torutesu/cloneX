"use client";

// SCR-017: 配備(公開・共有・リハーサル)
import { use, useEffect, useState } from "react";

type Employee = { id: string; slug: string; status: string; brainStatus: string };

export default function DeployPage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ai-employees/${aiId}`).then(async (res) => {
      if (res.ok) setEmployee((await res.json()).employee);
    });
  }, [aiId]);

  if (!employee) return <main className="p-6"><div className="card h-64 animate-pulse" /></main>;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/d/${employee.slug}`;
  const snippet = `<script>(function(){var b=document.createElement('button');b.textContent='デモを見る';b.style.cssText='position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:999px;background:#6C5CE7;color:#fff;border:0;font-weight:700;cursor:pointer;z-index:9999';b.onclick=function(){window.open('${shareUrl}','_blank')};document.body.appendChild(b)})();</script>`;

  async function togglePublish() {
    setError(null);
    const next = employee!.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const res = await fetch(`/api/ai-employees/${aiId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      setEmployee((await res.json()).employee);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "更新に失敗しました");
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-lg font-bold">配備</h1>

      <div className="card space-y-2 p-6">
        <label className="flex items-center gap-3">
          <input
            data-testid="publish-toggle"
            type="checkbox"
            className="h-5 w-5"
            checked={employee.status === "PUBLISHED"}
            onChange={togglePublish}
            disabled={employee.brainStatus !== "READY" && employee.status !== "PUBLISHED"}
          />
          <span className="font-bold">
            {employee.status === "PUBLISHED" ? "公開中" : "非公開"}
          </span>
          {employee.brainStatus !== "READY" && (
            <span className="text-xs" style={{ color: "var(--brand-text-muted)" }}>
              (Brain構築が完了するまで公開できません)
            </span>
          )}
        </label>
        {error && <p className="text-sm" style={{ color: "var(--brand-danger)" }}>{error}</p>}
      </div>

      <div className="card space-y-2 p-6">
        <label className="label">共有リンク</label>
        <div className="flex gap-2">
          <code data-testid="share-link" className="input flex-1 overflow-x-auto whitespace-nowrap text-xs">
            {shareUrl}
          </code>
          <button className="btn btn-secondary" onClick={() => copy(shareUrl, "link")}>
            {copied === "link" ? "✓" : "コピー"}
          </button>
        </div>
      </div>

      <div className="card space-y-2 p-6">
        <label className="label">埋込スニペット(サイト右下に「デモを見る」ボタン)</label>
        <div className="flex gap-2">
          <code className="input max-h-20 flex-1 overflow-auto text-[10px]">{snippet}</code>
          <button className="btn btn-secondary" onClick={() => copy(snippet, "snippet")}>
            {copied === "snippet" ? "✓" : "コピー"}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <a
          data-testid="rehearsal-start"
          className="btn btn-primary"
          href={`/d/${employee.slug}/rehearsal`}
          target="_blank"
          rel="noreferrer"
        >
          🎧 リハーサルを開始
        </a>
        <p className="mt-2 text-xs" style={{ color: "var(--brand-text-muted)" }}>
          リハーサルのセッションは一覧・インサイトに含まれません
        </p>
      </div>
    </main>
  );
}
