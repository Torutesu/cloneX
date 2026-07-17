"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, ApiClientError } from "@/lib/client/api";
import { Button, EmptyState, ErrorBanner, Skeleton, TextInput } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import type { Contact } from "@/lib/client/types";

function AddContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Contact) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { contact } = await apiPost<{ contact: Contact }>("/api/contacts", {
        name,
        email,
        title: title || undefined,
        companyName: companyName || undefined,
      });
      onCreated(contact);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="コンタクトを追加" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextInput
          data-testid="contact-name-input"
          placeholder="名前"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextInput
          data-testid="contact-email-input"
          type="email"
          placeholder="メールアドレス"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput placeholder="役職(任意)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextInput
          data-testid="contact-company-input"
          placeholder="企業名(任意・新規なら自動作成)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        {error && <ErrorBanner testId="contact-modal-error">{error}</ErrorBanner>}
        <Button data-testid="submit-button" type="submit" disabled={saving}>
          追加
        </Button>
      </form>
    </Modal>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((q: string) => {
    setError(null);
    apiGet<{ contacts: Contact[] }>(`/api/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((res) => setContacts(res.contacts))
      .catch(() => setError("コンタクトの読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  function handleSearchChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value), 300);
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">コンタクト</h1>
        <Button data-testid="add-contact-button" onClick={() => setModalOpen(true)}>
          + 追加
        </Button>
      </div>

      <TextInput
        data-testid="contact-search-input"
        placeholder="名前・メールで検索"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!contacts && !error && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {contacts && contacts.length === 0 && (
        <EmptyState
          title="コンタクトがいません"
          action={
            <Button className="text-sm" onClick={() => setModalOpen(true)}>
              追加
            </Button>
          }
        />
      )}

      {contacts && contacts.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 font-medium">名前</th>
              <th className="py-2 font-medium">メール</th>
              <th className="py-2 font-medium">役職</th>
              <th className="py-2 font-medium">企業</th>
              <th className="py-2 font-medium">関連ディール数</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} data-testid={`contact-row-${c.id}`} className="border-b border-border hover:bg-surface-hover">
                <td className="py-2">
                  <Link href={`/app/contacts/${c.id}`} className="text-primary hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="py-2 text-text-muted">{c.email}</td>
                <td className="py-2 text-text-muted">{c.title ?? "-"}</td>
                <td className="py-2 text-text-muted">{c.company?.name ?? "-"}</td>
                <td className="py-2 text-text-muted">{c.dealCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <AddContactModal onClose={() => setModalOpen(false)} onCreated={(c) => setContacts((prev) => (prev ? [c, ...prev] : [c]))} />
      )}
    </div>
  );
}
