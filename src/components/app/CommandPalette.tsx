"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/client/api";
import type { Board, Company, Contact } from "@/lib/client/types";

/**
 * "Find or create…" (⌘K) palette, mirroring the search field Octolane pins to
 * the top of its sidebar (observed in both captured app shots — the Quivly
 * case-study photo and the 8K product render). Searches deals, contacts and
 * companies through the same list APIs the pages use, plus create shortcuts.
 */
type Item =
  | { kind: "deal"; id: string; label: string; sub: string }
  | { kind: "contact"; id: string; label: string; sub: string }
  | { kind: "company"; id: string; label: string; sub: string }
  | { kind: "create"; href: string; label: string };

const CREATE_ITEMS: Item[] = [
  { kind: "create", href: "/app/pipeline", label: "＋ ディールを追加…" },
  { kind: "create", href: "/app/contacts", label: "＋ コンタクトを追加…" },
  { kind: "create", href: "/app/companies", label: "＋ 企業を追加…" },
];

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setIndex(0);
      return;
    }
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const [contacts, companies, board] = await Promise.all([
          apiGet<{ contacts: Contact[] }>(`/api/contacts?q=${encodeURIComponent(q)}`),
          apiGet<{ companies: Company[] }>(`/api/companies?q=${encodeURIComponent(q)}`),
          apiGet<Board>("/api/deals?view=board"),
        ]);
        if (seq.current !== mySeq) return; // stale response
        const lower = q.toLowerCase();
        const deals = board.stages
          .flatMap((s) => s.deals.map((d) => ({ ...d, stageName: s.stage.name })))
          .filter((d) => d.name.toLowerCase().includes(lower))
          .slice(0, 5);
        setResults([
          ...deals.map<Item>((d) => ({ kind: "deal", id: d.id, label: d.name, sub: d.stageName })),
          ...contacts.contacts.slice(0, 5).map<Item>((c) => ({ kind: "contact", id: c.id, label: c.name, sub: c.email })),
          ...companies.companies.slice(0, 5).map<Item>((c) => ({ kind: "company", id: c.id, label: c.name, sub: c.domain ?? "" })),
        ]);
        setIndex(0);
      } catch {
        /* keep previous results on transient errors */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const items: Item[] = [...results, ...CREATE_ITEMS];

  function open(item: Item) {
    onClose();
    if (item.kind === "create") router.push(item.href);
    else if (item.kind === "deal") router.push(`/app/deals/${item.id}`);
    else if (item.kind === "contact") router.push(`/app/contacts/${item.id}`);
    else router.push(`/app/companies/${item.id}`);
  }

  const KIND_LABEL: Record<string, string> = { deal: "ディール", contact: "コンタクト", company: "企業" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" data-testid="command-k-palette">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative w-[560px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-token border border-border bg-surface shadow-2xl">
        <input
          ref={inputRef}
          data-testid="command-k-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((n) => (n + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((n) => (n - 1 + items.length) % items.length);
            } else if (e.key === "Enter" && items[index]) {
              e.preventDefault();
              open(items[index]);
            }
          }}
          placeholder="検索または作成…"
          className="w-full border-b border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
        <div className="max-h-[45vh] overflow-y-auto p-1">
          {query.trim() && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-text-muted">一致する結果がありません</p>
          )}
          {items.map((item, i) => (
            <button
              key={item.kind === "create" ? item.href : `${item.kind}-${item.id}`}
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => open(item)}
              className={`flex min-h-10 w-full items-center gap-3 rounded-token px-3 py-2 text-left text-sm ${
                i === index ? "bg-surface-hover" : ""
              }`}
            >
              {item.kind === "create" ? (
                <span className="text-text-muted">{item.label}</span>
              ) : (
                <>
                  <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                    {KIND_LABEL[item.kind]}
                  </span>
                  <span className="min-w-0 truncate text-text">{item.label}</span>
                  <span className="ml-auto min-w-0 shrink truncate text-xs text-text-muted">{item.sub}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
