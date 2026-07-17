"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiGet, ApiClientError } from "@/lib/client/api";
import { Button, ErrorBanner, TextInput } from "@/components/ui/primitives";

type SyncStatus = { state: "running" | "done"; ingested: number; proposalsCreated: number; failed: number };

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncStatus | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost("/api/workspaces", { name: workspaceName });
      setStep(2);
    } catch (err) {
      setCreateError(err instanceof ApiClientError ? err.message : "エラーが発生しました");
    } finally {
      setCreating(false);
    }
  }

  async function pollStatus(jobId: string, attempt = 0): Promise<SyncStatus> {
    const status = await apiGet<SyncStatus>(`/api/integrations/mailbox/status?jobId=${encodeURIComponent(jobId)}`);
    if (status.state === "done" || attempt > 20) return status;
    await new Promise((r) => setTimeout(r, 250));
    return pollStatus(jobId, attempt + 1);
  }

  async function handleConnectAndSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await apiPost("/api/integrations/mailbox/connect");
      setConnected(true);
      const { jobId } = await apiPost<{ jobId: string }>("/api/integrations/mailbox/sync");
      const result = await pollStatus(jobId);
      setSyncResult(result);
    } catch (err) {
      setSyncError(err instanceof ApiClientError ? err.message : "同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-lg rounded-token border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <span className={step === 1 ? "font-semibold text-primary" : ""}>1. ワークスペース作成</span>
          <span>→</span>
          <span className={step === 2 ? "font-semibold text-primary" : ""}>2. メールボックス接続</span>
        </div>

        {step === 1 && (
          <form className="flex flex-col gap-3" onSubmit={handleCreateWorkspace}>
            <label className="text-sm font-medium text-text">ワークスペース名</label>
            <TextInput
              data-testid="workspace-name-input"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="例: Acme Inc"
            />
            {createError && <ErrorBanner>{createError}</ErrorBanner>}
            <Button data-testid="create-workspace-button" type="submit" disabled={creating} className="mt-2">
              作成して次へ
            </Button>
          </form>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            {!connected && !syncing && (
              <Button data-testid="connect-mailbox-button" onClick={handleConnectAndSync}>
                メールボックスを接続
              </Button>
            )}

            {syncing && (
              <div data-testid="sync-progress" className="flex flex-col gap-2">
                <div className="h-2 w-full overflow-hidden rounded-token bg-surface-hover">
                  <div className="h-full w-2/3 animate-pulse bg-primary" />
                </div>
                <p className="text-sm text-text-muted">メールを解析しています…</p>
              </div>
            )}

            {syncError && (
              <div className="flex flex-col gap-2">
                <ErrorBanner>{syncError}</ErrorBanner>
                <Button variant="secondary" onClick={handleConnectAndSync}>
                  再試行
                </Button>
              </div>
            )}

            {syncResult && (
              <div className="flex flex-col gap-3">
                <p data-testid="sync-summary" className="text-sm text-text">
                  {syncResult.ingested}件のメールから{syncResult.proposalsCreated}件の提案が生成されました
                </p>
                <Button data-testid="go-to-review-button" onClick={() => router.push("/app/review")}>
                  提案を確認する →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
