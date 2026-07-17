"use client";

// SCR-013: Brain — ナレッジビュー(ギャップ解消の中心)
import { use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Node = {
  id: string;
  kind: string;
  title: string;
  body: string;
  isEdited: boolean;
  source: { name: string } | null;
  updatedAt: string;
};
type Gap = { id: string; question: string; status: string };

const KIND_LABEL: Record<string, string> = {
  FEATURE: "機能",
  FAQ: "FAQ",
  OBJECTION: "オブジェクション",
  OTHER: "その他",
};

export default function KnowledgePage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const searchParams = useSearchParams();
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [kindFilter, setKindFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    | { mode: "create"; gapId?: string; title: string; body: string; kind: string }
    | { mode: "edit"; node: Node; title: string; body: string; kind: string }
    | null
  >(null);
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (kindFilter) q.set("kind", kindFilter);
    if (search) q.set("q", search);
    const [nodesRes, gapsRes] = await Promise.all([
      fetch(`/api/ai-employees/${aiId}/knowledge?${q}`),
      fetch(`/api/ai-employees/${aiId}/gaps?status=OPEN`),
    ]);
    if (nodesRes.ok) setNodes((await nodesRes.json()).nodes);
    if (gapsRes.ok) setGaps((await gapsRes.json()).gaps);
  }, [aiId, kindFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  // インサイト/セッション詳細からの ?gap=<id>&q=<question> でモーダルを自動オープン
  useEffect(() => {
    const gapId = searchParams.get("gap");
    const q = searchParams.get("q");
    if ((gapId || q) && !modal) {
      setModal({ mode: "create", gapId: gapId || undefined, title: q ?? "", body: "", kind: "FAQ" });
    }
    // gapsロード後に質問文を補完
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (modal?.mode === "create" && modal.gapId && !modal.title) {
      const gap = gaps.find((g) => g.id === modal.gapId);
      if (gap) setModal({ ...modal, title: gap.question });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaps]);

  function openGapModal(gap: Gap) {
    setModal({ mode: "create", gapId: gap.id, title: gap.question, body: "", kind: "FAQ" });
  }

  async function draftWithAi() {
    if (modal?.mode !== "create" || !modal.gapId) return;
    setDrafting(true);
    const res = await fetch("/api/ai/draft-answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gapId: modal.gapId }),
    });
    if (res.ok) {
      const draft = await res.json();
      setModal({ ...modal, body: draft.body || modal.body, title: draft.title || modal.title });
    }
    setDrafting(false);
  }

  async function save() {
    if (!modal) return;
    if (modal.mode === "create" && modal.gapId) {
      await fetch(`/api/gaps/${modal.gapId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: modal.title, body: modal.body }),
      });
    } else if (modal.mode === "create") {
      await fetch(`/api/ai-employees/${aiId}/knowledge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: modal.kind, title: modal.title, body: modal.body }),
      });
    } else {
      await fetch(`/api/knowledge/${modal.node.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: modal.kind, title: modal.title, body: modal.body }),
      });
    }
    setModal(null);
    load();
  }

  async function remove(node: Node) {
    if (!confirm(`「${node.title}」を削除しますか?`)) return;
    await fetch(`/api/knowledge/${node.id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-bold">Brain: ナレッジ</h1>

      {gaps.length > 0 && (
        <div
          data-testid="gap-banner"
          className="card mb-4 space-y-2 border-l-4 p-4"
          style={{ borderLeftColor: "var(--brand-warning)" }}
        >
          <p className="text-sm font-bold">⚠ 未解決の知識ギャップ {gaps.length}件</p>
          {gaps.map((gap) => (
            <div key={gap.id} data-testid="gap-row" data-gap-id={gap.id} className="flex items-center justify-between gap-2 text-sm">
              <span>「{gap.question}」</span>
              <button data-testid="gap-answer" className="btn btn-primary" onClick={() => openGapModal(gap)}>
                回答を作成
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <select className="input w-40" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="">全種別</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input className="input w-64" placeholder="検索" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex-1" />
        <button
          data-testid="add-node"
          className="btn btn-secondary"
          onClick={() => setModal({ mode: "create", title: "", body: "", kind: "FAQ" })}
        >
          + 手動追加
        </button>
      </div>

      {nodes === null ? (
        <div className="card h-40 animate-pulse" />
      ) : nodes.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          ナレッジがありません。ソースを追加するか、手動で作成してください
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>種別</th><th>タイトル</th><th>由来</th><th>更新</th><th></th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id} data-testid="node-row">
                  <td><span className="badge badge-muted">{KIND_LABEL[node.kind] ?? node.kind}</span></td>
                  <td>
                    <p className="font-medium">{node.title}</p>
                    {node.isEdited && <span className="badge badge-warning">手動修正済み</span>}
                  </td>
                  <td className="text-xs">{node.source?.name ?? "手動"}</td>
                  <td className="text-xs">{new Date(node.updatedAt).toLocaleDateString("ja-JP")}</td>
                  <td className="whitespace-nowrap">
                    <button className="btn btn-secondary mr-1" onClick={() => setModal({ mode: "edit", node, title: node.title, body: node.body, kind: node.kind })}>✏️</button>
                    <button className="btn btn-secondary" onClick={() => remove(node)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div data-testid="node-modal" className="card w-full max-w-lg space-y-3 p-6">
            <h2 className="font-bold">
              {modal.mode === "edit" ? "ナレッジを編集" : modal.mode === "create" && modal.gapId ? "ギャップに回答を作成" : "ナレッジを追加"}
            </h2>
            <div>
              <label className="label">種別</label>
              <select
                className="input"
                value={modal.kind}
                onChange={(e) => setModal({ ...modal, kind: e.target.value })}
                disabled={modal.mode === "create" && !!modal.gapId}
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">タイトル</label>
              <input data-testid="node-title" className="input" value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">本文(回答)</label>
                {modal.mode === "create" && modal.gapId && (
                  <button className="btn btn-secondary text-xs" onClick={draftWithAi} disabled={drafting}>
                    {drafting ? "生成中…" : "AIで下書き"}
                  </button>
                )}
              </div>
              <textarea data-testid="node-body" className="input min-h-28" value={modal.body} onChange={(e) => setModal({ ...modal, body: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>キャンセル</button>
              <button data-testid="node-save" className="btn btn-primary" onClick={save} disabled={!modal.title || !modal.body}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
