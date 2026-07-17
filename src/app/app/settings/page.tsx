"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete, ApiClientError } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { Button, Card, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/client/format";
import type { ApiTokenRecord, AutoApprovePolicy, ProposalType } from "@/lib/client/types";

const PROPOSAL_TYPES: { key: ProposalType; label: string }[] = [
  { key: "NEW_DEAL", label: "新規ディール" },
  { key: "NEW_CONTACT", label: "新規コンタクト" },
  { key: "FIELD_UPDATE", label: "フィールド更新" },
  { key: "DRAFT_EMAIL", label: "フォローアップ草稿" },
  { key: "TASK", label: "タスク" },
];

type SyncStatus = { state: "running" | "done"; ingested: number; proposalsCreated: number; failed: number };

function MailboxSection() {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const { jobId } = await apiPost<{ jobId: string }>("/api/integrations/mailbox/sync");
      const status = await apiGet<SyncStatus>(`/api/integrations/mailbox/status?jobId=${encodeURIComponent(jobId)}`);
      if (status.ingested === 0) {
        toast.show("新着はありません", { kind: "info" });
      } else {
        toast.show(`${status.ingested}件の新着メールから${status.proposalsCreated}件の提案が生成されました`);
      }
    } catch (err) {
      toast.show(err instanceof ApiClientError ? err.message : "同期に失敗しました", { kind: "error" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text">メール連携</h2>
      <p className="mb-3 text-sm text-text-muted">接続状態: 連携済み</p>
      <div className="flex gap-2">
        <Button data-testid="sync-now-button" onClick={handleSyncNow} disabled={syncing}>
          {syncing ? "同期中…" : "今すぐ同期"}
        </Button>
        <Button data-testid="manual-add-email-button" variant="secondary" onClick={() => setModalOpen(true)}>
          メールを手動追加
        </Button>
      </div>
      {modalOpen && <ManualEmailModal onClose={() => setModalOpen(false)} />}
    </Card>
  );
}

function ManualEmailModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await apiPost<{ messageId: string; proposals: { status: string }[]; failed: boolean }>(
        "/api/ingest/email",
        { fromEmail, subject, bodyText },
      );
      onClose();
      const autoApproved = result.proposals.filter((p) => p.status === "AUTO_APPROVED").length;
      if (result.failed) {
        toast.show("メールの解析に失敗しました", { kind: "error" });
      } else if (autoApproved > 0) {
        toast.show(`${autoApproved}件の提案が自動承認されました`, {
          action: { label: "Reviewへ", onClick: () => router.push("/app/review") },
        });
      } else if (result.proposals.length > 0) {
        toast.show(`提案が${result.proposals.length}件生成されました`, {
          action: { label: "Reviewへ", onClick: () => router.push("/app/review") },
        });
      } else {
        toast.show("関連する提案はありませんでした", { kind: "info" });
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "取り込みに失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="メールを手動追加" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextInput
          data-testid="manual-email-from-input"
          type="email"
          placeholder="差出人メールアドレス"
          required
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
        />
        <TextInput
          data-testid="manual-email-subject-input"
          placeholder="件名"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          data-testid="manual-email-body-input"
          placeholder="本文"
          required
          rows={5}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          className="w-full rounded-token border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Button data-testid="manual-email-submit" type="submit" disabled={saving}>
          取り込む
        </Button>
      </form>
    </Modal>
  );
}

function AutoApproveSection() {
  const toast = useToast();
  const [policies, setPolicies] = useState<AutoApprovePolicy[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ policies: AutoApprovePolicy[] }>("/api/settings/auto-approve").then((res) => setPolicies(res.policies));
  }, []);

  function update(type: ProposalType, patch: Partial<AutoApprovePolicy>) {
    setPolicies((prev) => (prev ? prev.map((p) => (p.proposalType === type ? { ...p, ...patch } : p)) : prev));
  }

  async function handleSave() {
    if (!policies) return;
    setSaving(true);
    try {
      const body = {
        policies: policies.map((p) => ({
          proposalType: p.proposalType,
          enabled: p.enabled,
          threshold: p.threshold > 1 ? 0.9 : p.threshold,
        })),
      };
      const res = await apiPut<{ policies: AutoApprovePolicy[] }>("/api/settings/auto-approve", body);
      setPolicies(res.policies);
      toast.show("設定を保存しました");
    } catch {
      toast.show("保存に失敗しました", { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text">自動承認</h2>
      {!policies && <Skeleton className="h-32 w-full" />}
      {policies && (
        <div className="flex flex-col gap-3">
          {PROPOSAL_TYPES.map(({ key, label }) => {
            const policy = policies.find((p) => p.proposalType === key);
            const threshold = policy && policy.threshold <= 1 ? policy.threshold : 0.9;
            return (
              <div key={key} className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex w-40 items-center gap-2">
                  <input
                    data-testid={`auto-approve-toggle-${key}`}
                    type="checkbox"
                    checked={policy?.enabled ?? false}
                    onChange={(e) => update(key, { enabled: e.target.checked })}
                    className="accent-primary"
                  />
                  {label}
                </label>
                <label className="flex items-center gap-2 text-text-muted">
                  しきい値
                  <input
                    data-testid={`auto-approve-threshold-${key}`}
                    type="number"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={threshold}
                    onChange={(e) => update(key, { threshold: Number(e.target.value) })}
                    className="w-20 rounded-token border border-border bg-surface px-2 py-1 text-text"
                  />
                </label>
              </div>
            );
          })}
          <Button data-testid="save-auto-approve-button" onClick={handleSave} disabled={saving} className="mt-2 self-start">
            保存
          </Button>
        </div>
      )}
    </Card>
  );
}

function ApiTokenSection() {
  const [tokens, setTokens] = useState<ApiTokenRecord[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    apiGet<{ tokens: ApiTokenRecord[] }>("/api/tokens").then((res) => setTokens(res.tokens));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevoke(id: string) {
    await apiDelete(`/api/tokens/${id}`);
    setTokens((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
  }

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        clonex: {
          url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp`,
          headers: { Authorization: "Bearer <YOUR_TOKEN>" },
        },
      },
    },
    null,
    2,
  );

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text">API & MCP</h2>

      {!tokens && <Skeleton className="h-20 w-full" />}
      {tokens && tokens.length === 0 && <p className="mb-3 text-sm text-text-muted">トークンがありません</p>}
      {tokens && tokens.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-text">{t.name}</p>
                <p className="text-xs text-text-muted">
                  作成: {formatDateTime(t.createdAt)} / 最終使用: {t.lastUsedAt ? formatDateTime(t.lastUsedAt) : "未使用"}
                </p>
              </div>
              <Button variant="ghost" className="text-xs" onClick={() => handleRevoke(t.id)}>
                失効
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button data-testid="add-token-button" variant="secondary" onClick={() => setModalOpen(true)}>
        新規発行
      </Button>

      <div className="mt-4 rounded-token bg-surface-hover p-3 text-xs">
        <p className="mb-1 font-medium text-text">MCPエンドポイント</p>
        <code className="block break-all">/api/mcp</code>
        <p className="mb-1 mt-2 font-medium text-text">Claude Desktop 接続例</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-text-muted">{mcpConfig}</pre>
      </div>

      {modalOpen && (
        <CreateTokenModal
          onClose={() => setModalOpen(false)}
          onCreated={() => load()}
        />
      )}
    </Card>
  );
}

function CreateTokenModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { token } = await apiPost<{ token: string }>("/api/tokens", { name });
      setPlaintext(token);
      onCreated();
    } catch {
      setError("トークンの発行に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="APIトークンを発行" onClose={onClose}>
      {plaintext ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">このトークンは一度しか表示されません。安全な場所に保存してください。</p>
          <code data-testid="token-plaintext" className="break-all rounded-token bg-surface-hover p-2 text-xs text-text">
            {plaintext}
          </code>
          <Button onClick={onClose}>閉じる</Button>
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <TextInput placeholder="トークン名" required value={name} onChange={(e) => setName(e.target.value)} />
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <Button type="submit" disabled={saving}>
            発行
          </Button>
        </form>
      )}
    </Modal>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <h1 className="mb-6 text-xl font-bold text-text">設定</h1>
      <div className="flex flex-col gap-6">
        <MailboxSection />
        <AutoApproveSection />
        <ApiTokenSection />
      </div>
    </div>
  );
}
