"use client";

// SCR-014: デモシナリオ編集(LiveBox簡易版)
import { use, useCallback, useEffect, useState } from "react";
import { SUPPORTED_LANGS } from "@/lib/i18n";

type Step = {
  id: string;
  order: number;
  title: string;
  route: string;
  selector: string | null;
  narration: Record<string, string>;
};
type Scenario = { id: string; title: string };

export default function ScenarioPage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const [scenario, setScenario] = useState<Scenario | null | undefined>(undefined);
  const [steps, setSteps] = useState<Step[]>([]);
  const [modal, setModal] = useState<{ step: Step | null; draft: Omit<Step, "id" | "order"> } | null>(null);
  const [narrLang, setNarrLang] = useState("ja");
  const [preview, setPreview] = useState<Step | null>(null);
  const [translating, setTranslating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/ai-employees/${aiId}/scenario`);
    if (res.ok) {
      const data = await res.json();
      setScenario(data.scenario);
      setSteps(data.steps);
    }
  }, [aiId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveModal() {
    if (!modal) return;
    if (modal.step) {
      await fetch(`/api/steps/${modal.step.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(modal.draft),
      });
    } else if (scenario) {
      await fetch(`/api/scenarios/${scenario.id}/steps`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(modal.draft),
      });
    }
    setModal(null);
    load();
  }

  async function removeStep(step: Step) {
    if (!confirm(`Step${step.order}「${step.title}」を削除しますか?`)) return;
    await fetch(`/api/steps/${step.id}`, { method: "DELETE" });
    load();
  }

  async function move(step: Step, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === step.id);
    const target = idx + dir;
    if (target < 0 || target >= steps.length || !scenario) return;
    const ids = steps.map((s) => s.id);
    const tmp = ids[idx]!;
    ids[idx] = ids[target]!;
    ids[target] = tmp;
    await fetch(`/api/scenarios/${scenario.id}/reorder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stepIds: ids }),
    });
    load();
  }

  async function translateNarration() {
    if (!modal?.step) return;
    setTranslating(true);
    const res = await fetch("/api/ai/translate-narration", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stepId: modal.step.id, targetLang: narrLang }),
    });
    if (res.ok) {
      const { narration } = await res.json();
      setModal((m) =>
        m ? { ...m, draft: { ...m.draft, narration: { ...m.draft.narration, [narrLang]: narration } } } : m,
      );
    }
    setTranslating(false);
  }

  if (scenario === undefined) {
    return <main className="p-6"><div className="card h-64 animate-pulse" /></main>;
  }

  const emptyDraft = { title: "", route: "/demo-target/dashboard", selector: "", narration: {} as Record<string, string> };

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">デモシナリオ{scenario ? `: ${scenario.title}` : ""}</h1>
        <button
          data-testid="add-step"
          className="btn btn-primary"
          onClick={() => setModal({ step: null, draft: emptyDraft })}
          disabled={!scenario && steps.length === 0 && scenario === null && false}
        >
          + ステップを追加
        </button>
      </div>

      {scenario === null ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          Brain構築後に自動生成されます。手動作成も可能です
        </div>
      ) : steps.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          ステップがありません
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} data-testid="step-card" className="card space-y-1 p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold">
                  Step{step.order}: {step.title}
                </p>
                <div className="flex gap-1">
                  <button className="btn btn-secondary" onClick={() => move(step, -1)}>↑</button>
                  <button className="btn btn-secondary" onClick={() => move(step, 1)}>↓</button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setModal({
                        step,
                        draft: {
                          title: step.title,
                          route: step.route,
                          selector: step.selector ?? "",
                          narration: { ...step.narration },
                        },
                      });
                      setNarrLang("ja");
                    }}
                  >
                    ✏️
                  </button>
                  <button className="btn btn-secondary" onClick={() => removeStep(step)}>🗑</button>
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--brand-text-muted)" }}>
                route: {step.route} / selector: {step.selector ?? "(全景)"}
              </p>
              <p className="text-sm">{step.narration.ja ?? Object.values(step.narration)[0]}</p>
              <button className="text-xs underline" onClick={() => setPreview(step)}>
                プレビュー
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg space-y-3 p-6">
            <h2 className="font-bold">{modal.step ? `Step${modal.step.order}を編集` : "ステップを追加"}</h2>
            <div>
              <label className="label">タイトル</label>
              <input className="input" value={modal.draft.title} onChange={(e) => setModal({ ...modal, draft: { ...modal.draft, title: e.target.value } })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">route</label>
                <input className="input" value={modal.draft.route} onChange={(e) => setModal({ ...modal, draft: { ...modal.draft, route: e.target.value } })} />
              </div>
              <div>
                <label className="label">selector(空=全景)</label>
                <input className="input" value={modal.draft.selector ?? ""} onChange={(e) => setModal({ ...modal, draft: { ...modal.draft, selector: e.target.value } })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">ナレーション</label>
                {modal.step && !modal.draft.narration[narrLang] && (
                  <button className="btn btn-secondary text-xs" onClick={translateNarration} disabled={translating}>
                    {translating ? "翻訳中…" : "AIで翻訳"}
                  </button>
                )}
              </div>
              <div className="mb-1 flex gap-1">
                {SUPPORTED_LANGS.map((lang) => (
                  <button
                    key={lang}
                    className={`badge ${narrLang === lang ? "badge-success" : "badge-muted"}`}
                    onClick={() => setNarrLang(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <textarea
                className="input min-h-20"
                value={modal.draft.narration[narrLang] ?? ""}
                onChange={(e) =>
                  setModal({
                    ...modal,
                    draft: { ...modal.draft, narration: { ...modal.draft.narration, [narrLang]: e.target.value } },
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>キャンセル</button>
              <button data-testid="step-save" className="btn btn-primary" onClick={saveModal} disabled={!modal.draft.title || !modal.draft.route}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setPreview(null)}>
          <div className="card h-[70vh] w-full max-w-3xl overflow-hidden">
            <iframe src={preview.route} title="preview" className="h-full w-full border-0" />
          </div>
        </div>
      )}
    </main>
  );
}
