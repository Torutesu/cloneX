"use client";

// SCR-011: AI社員作成ウィザード(3ステップ)
import { useState } from "react";
import Link from "next/link";

export default function NewEmployeePage() {
  const [step, setStep] = useState(1);
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState<{ nodes: number; steps: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createEmployee() {
    setError(null);
    const res = await fetch("/api/ai-employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: displayName, productName, productUrl }),
    });
    if (res.ok) {
      const { employee } = await res.json();
      setEmployeeId(employee.id);
      setStep(2);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "作成に失敗しました");
    }
  }

  async function buildBrain() {
    if (!employeeId) return;
    setBuilding(true);
    setFailed(false);
    const res = await fetch(`/api/ai-employees/${employeeId}/build-brain`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBuilding(false);
    if (res.ok && data.brainStatus === "READY") {
      setResult(data.counts);
      setStep(3);
    } else {
      setFailed(true);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-lg font-bold">AI社員を作成</h1>
      <p className="mb-5 text-sm" style={{ color: "var(--brand-text-muted)" }}>
        ステップ {step}/3
      </p>

      {step === 1 && (
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">製品名</label>
            <input data-testid="product-name" className="input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="TaskFlow" />
          </div>
          <div>
            <label className="label">製品URL</label>
            <input data-testid="product-url" className="input" type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label className="label">AI社員の表示名</label>
            <input data-testid="display-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Sana" />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--brand-danger)" }}>{error}</p>}
          <button
            data-testid="wizard-next"
            className="btn btn-primary"
            onClick={createEmployee}
            disabled={!productName || !productUrl || !displayName}
          >
            次へ
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4 p-6">
          <p className="text-sm">
            URLから自動で学習します。ナレッジ・デモシナリオ・挨拶文を生成します(AIF-001)。
          </p>
          {building ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--brand-text-muted)" }}>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
              Brainを構築しています…
            </div>
          ) : failed ? (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: "var(--brand-danger)" }}>
                構築に失敗しました。再試行するか、手動でソースを追加してください。
              </p>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={buildBrain}>再試行</button>
                {employeeId && (
                  <Link className="btn btn-secondary" href={`/app/${employeeId}/brain/sources`}>
                    ソースを追加
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <button data-testid="build-brain" className="btn btn-primary" onClick={buildBrain}>
              構築開始
            </button>
          )}
        </div>
      )}

      {step === 3 && result && (
        <div className="card space-y-4 p-6">
          <p data-testid="build-result" className="font-bold" style={{ color: "var(--brand-success)" }}>
            ✅ ナレッジ {result.nodes}件・デモシナリオ {result.steps}ステップを生成しました
          </p>
          <p className="text-sm" style={{ color: "var(--brand-text-muted)" }}>
            リハーサルで確認してから公開しましょう。
          </p>
          <div className="flex gap-2">
            <Link data-testid="goto-persona" className="btn btn-primary" href={`/app/${employeeId}/persona`}>
              ペルソナ設定へ
            </Link>
            <Link data-testid="goto-scenario" className="btn btn-secondary" href={`/app/${employeeId}/scenario`}>
              デモ設定へ
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
