"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/client/api";
import { Card, ErrorBanner, Skeleton } from "@/components/ui/primitives";
import type { Company, Contact, Deal } from "@/lib/client/types";

type CompanyDetailResponse = {
  company: Company;
  contacts: Contact[];
  deals: (Deal & { stage: { name: string } })[];
};

function InlineField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [display, setDisplay] = useState(value);

  async function save(next: string) {
    if (next.trim() && next !== display) {
      await onSave(next);
      setDisplay(next);
    }
    setEditing(false);
  }

  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      {editing ? (
        <input
          autoFocus
          defaultValue={display}
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save((e.target as HTMLInputElement).value)}
          className="w-full rounded-token border border-border bg-surface px-2 py-1 text-sm text-text"
        />
      ) : (
        <p onClick={() => setEditing(true)} className="cursor-text text-sm text-text">
          {display || "-"}
        </p>
      )}
    </div>
  );
}

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CompanyDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<CompanyDetailResponse>(`/api/companies/${params.id}`);
      setData(res);
    } catch {
      setNotFound(true);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <div className="p-8">
        <ErrorBanner>企業が見つかりません</ErrorBanner>
        <Link href="/app/companies" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← 企業一覧へ戻る
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { company, contacts, deals } = data;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <h1 className="mb-4 text-lg font-bold text-text">{company.name}</h1>
          <div className="flex flex-col gap-3">
            <InlineField
              label="名前"
              value={company.name}
              onSave={async (v) => {
                await apiPatch(`/api/companies/${company.id}`, { name: v });
              }}
            />
            <InlineField
              label="ドメイン"
              value={company.domain ?? ""}
              onSave={async (v) => {
                await apiPatch(`/api/companies/${company.id}`, { domain: v });
              }}
            />
          </div>
        </Card>

        <div className="md:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">所属コンタクト</h2>
          <div className="mb-6 flex flex-col gap-2">
            {contacts.length === 0 && <p className="text-sm text-text-muted">コンタクトはいません</p>}
            {contacts.map((c) => (
              <Link
                key={c.id}
                data-testid={`contact-row-${c.id}`}
                href={`/app/contacts/${c.id}`}
                className="rounded-token border border-border bg-surface p-3 text-sm text-text hover:bg-surface-hover"
              >
                {c.name} — {c.email}
              </Link>
            ))}
          </div>

          <h2 className="mb-2 text-sm font-semibold text-text-muted">関連ディール</h2>
          <div className="flex flex-col gap-2">
            {deals.length === 0 && <p className="text-sm text-text-muted">関連ディールはありません</p>}
            {deals.map((d) => (
              <Link
                key={d.id}
                data-testid={`deal-card-${d.id}`}
                href={`/app/deals/${d.id}`}
                className="rounded-token border border-border bg-surface p-3 text-sm text-text hover:bg-surface-hover"
              >
                {d.name} — {d.stage?.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
