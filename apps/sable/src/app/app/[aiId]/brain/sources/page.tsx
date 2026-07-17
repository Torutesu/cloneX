"use client";

// SCR-012: Brain — ソース管理
import { use, useCallback, useEffect, useState } from "react";

type Source = { id: string; type: string; name: string; status: string; createdAt: string };

const TYPE_LABEL: Record<string, string> = {
  PRODUCT_URL: "URL",
  DOCUMENT: "ドキュメント",
  CALL_RECORDING: "商談録音",
  MARKETING: "マーケ資料",
};

export default function SourcesPage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [modal, setModal] = useState<{ type: string; name: string; content: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/ai-employees/${aiId}/sources`);
    if (res.ok) setSources((await res.json()).sources);
  }, [aiId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSource() {
    if (!modal) return;
    setBusy(true);
    const res = await fetch(`/api/ai-employees/${aiId}/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        modal.type === "PRODUCT_URL"
          ? { type: modal.type, name: modal.name, url: modal.content }
          : { type: modal.type, name: modal.name, content: modal.content },
      ),
    });
    setBusy(false);
    if (res.ok) {
      const { addedNodes } = await res.json();
      setToast(`ナレッジが${addedNodes}件増えました`);
      setTimeout(() => setToast(null), 4000);
      setModal(null);
      load();
    }
  }

  async function reprocess(id: string) {
    await fetch(`/api/sources/${id}/reprocess`, { method: "POST" });
    load();
  }

  async function remove(source: Source) {
    if (!confirm(`「${source.name}」を削除しますか?(由来ナレッジは残ります)`)) return;
    await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Brain: ソース</h1>
        <div className="flex gap-2">
          {Object.entries(TYPE_LABEL).map(([type, label]) => (
            <button
              key={type}
              data-testid={`add-source-${type}`}
              className="btn btn-secondary"
              onClick={() => setModal({ type, name: "", content: "" })}
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="card mb-3 p-3 text-sm font-bold" style={{ color: "var(--brand-success)" }}>
          ✅ {toast}
        </div>
      )}

      {sources === null ? (
        <div className="card h-40 animate-pulse" />
      ) : sources.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          ソースがありません。製品URLだけでも学習できます
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr><th>種別</th><th>名前</th><th>状態</th><th>追加日</th><th></th></tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} data-testid="source-row">
                  <td><span className="badge badge-muted">{TYPE_LABEL[s.type] ?? s.type}</span></td>
                  <td>{s.name}</td>
                  <td>
                    {s.status === "READY" ? (
                      <span className="badge badge-success">READY</span>
                    ) : s.status === "FAILED" ? (
                      <span className="badge badge-warning">
                        FAILED <button className="underline" onClick={() => reprocess(s.id)}>再処理</button>
                      </span>
                    ) : (
                      <span className="badge badge-muted">{s.status}…</span>
                    )}
                  </td>
                  <td className="text-xs">{new Date(s.createdAt).toLocaleDateString("ja-JP")}</td>
                  <td><button className="btn btn-secondary" onClick={() => remove(s)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg space-y-3 p-6">
            <h2 className="font-bold">{TYPE_LABEL[modal.type]}を追加</h2>
            <div>
              <label className="label">名前</label>
              <input data-testid="source-name" className="input" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{modal.type === "PRODUCT_URL" ? "URL" : "テキスト(文字起こし・本文の貼り付け)"}</label>
              {modal.type === "PRODUCT_URL" ? (
                <input data-testid="source-content" className="input" type="url" value={modal.content} onChange={(e) => setModal({ ...modal, content: e.target.value })} />
              ) : (
                <textarea data-testid="source-content" className="input min-h-32" value={modal.content} onChange={(e) => setModal({ ...modal, content: e.target.value })} />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>キャンセル</button>
              <button data-testid="source-save" className="btn btn-primary" onClick={addSource} disabled={busy || !modal.name || !modal.content}>
                {busy ? "処理中…" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
