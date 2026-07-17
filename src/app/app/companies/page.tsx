"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiClientError } from "@/lib/client/api";
import { Button, EmptyState, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { useIsMobile } from "@/lib/client/useIsMobile";
import type { Company } from "@/lib/client/types";

function AddCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Company) => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { company } = await apiPost<{ company: Company }>("/api/companies", {
        name,
        domain: domain || undefined,
      });
      onCreated(company);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="企業を追加" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextInput
          data-testid="company-name-input"
          placeholder="企業名"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextInput
          data-testid="company-domain-input"
          placeholder="ドメイン(任意)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        {error && <ErrorBanner testId="contact-modal-error">{error}</ErrorBanner>}
        <Button data-testid="submit-button" type="submit" disabled={saving}>
          追加
        </Button>
      </form>
    </Modal>
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const load = useCallback(() => {
    setError(null);
    apiGet<{ companies: Company[] }>("/api/companies")
      .then((res) => setCompanies(res.companies))
      .catch(() => setError("企業の読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-text">企業</h1>
        <Button data-testid="add-company-button" onClick={() => setModalOpen(true)}>
          + 追加
        </Button>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!companies && !error && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {companies && companies.length === 0 && (
        <EmptyState
          title="企業がありません"
          action={
            <Button className="text-sm" onClick={() => setModalOpen(true)}>
              追加
            </Button>
          }
        />
      )}

      {companies && companies.length > 0 && (isMobile ? (
        <div className="flex flex-col gap-2">
          {companies.map((c) => (
            <div
              key={c.id}
              data-testid={`company-row-${c.id}`}
              className="cursor-pointer rounded-token border border-border bg-surface p-3 text-sm"
              onClick={() => router.push(`/app/companies/${c.id}`)}
            >
              <div className="flex items-center justify-between gap-2">
                <Link href={`/app/companies/${c.id}`} className="min-w-0 truncate font-medium text-primary hover:underline">
                  {c.name}
                </Link>
                <span className="shrink-0 text-xs text-text-muted">{c.dealCount ?? 0}件</span>
              </div>
              <p className="truncate text-xs text-text-muted">{c.domain ?? "-"}</p>
              <p className="truncate text-xs text-text-muted">コンタクト {c.contactCount ?? 0}件</p>
            </div>
          ))}
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 font-medium">名前</th>
              <th className="py-2 font-medium">ドメイン</th>
              <th className="py-2 font-medium">コンタクト数</th>
              <th className="py-2 font-medium">ディール数</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr
                key={c.id}
                data-testid={`company-row-${c.id}`}
                className="cursor-pointer border-b border-border hover:bg-surface-hover"
                onClick={() => router.push(`/app/companies/${c.id}`)}
              >
                <td className="py-2">
                  <Link href={`/app/companies/${c.id}`} className="text-primary hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="py-2 text-text-muted">{c.domain ?? "-"}</td>
                <td className="py-2 text-text-muted">{c.contactCount ?? 0}</td>
                <td className="py-2 text-text-muted">{c.dealCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {modalOpen && (
        <AddCompanyModal onClose={() => setModalOpen(false)} onCreated={(c) => setCompanies((prev) => (prev ? [c, ...prev] : [c]))} />
      )}
    </div>
  );
}
