"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User, Workspace } from "@prisma/client";
import { ReviewBadgeProvider, useReviewBadge } from "@/components/app/ReviewBadgeContext";
import { CommandPalette } from "@/components/app/CommandPalette";
import { apiPost } from "@/lib/client/api";

/**
 * Line icons (currentColor, 1.6 stroke) that echo Octolane's quiet monochrome
 * sidebar — the accent only appears on the active row. 18px on a 24 viewbox.
 */
function Icon({ name }: { name: NavKey }) {
  const paths: Record<NavKey, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
    chat: <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3a8.38 8.38 0 0 1 8.5 8.5Z" />,
    pipeline: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="10" rx="1" />
        <rect x="17" y="4" width="4" height="13" rx="1" />
      </>
    ),
    contacts: (
      <>
        <circle cx="9" cy="7" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M17 4a3.5 3.5 0 0 1 0 6.5" />
        <path d="M18 14a6 6 0 0 1 3.5 5.5" />
      </>
    ),
    companies: (
      <>
        <rect x="4" y="3" width="12" height="18" rx="1" />
        <path d="M16 8h4v13H8" />
        <path d="M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1" />
      </>
    ),
    tasks: (
      <>
        <path d="m3 8 2.5 2.5L10 6" />
        <path d="m3 17 2.5 2.5L10 15" />
        <path d="M13 8h8M13 17h8" />
      </>
    ),
    review: (
      <>
        <path d="M4 4h16v12H5.2L4 17.5Z" />
        <path d="m9 10 2 2 4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.2 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3.3 6.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H8a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {paths[name]}
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "dashboard", href: "/app", label: "Dashboard" },
  { key: "chat", href: "/app/chat", label: "Chat" },
  { key: "pipeline", href: "/app/pipeline", label: "Pipeline" },
  { key: "contacts", href: "/app/contacts", label: "Contacts" },
  { key: "companies", href: "/app/companies", label: "Companies" },
  { key: "tasks", href: "/app/tasks", label: "Tasks" },
  { key: "review", href: "/app/review", label: "Review" },
  { key: "settings", href: "/app/settings", label: "Settings" },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

/** Small brand lockup: a blue rounded mark + wordmark, shared across headers. */
function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-text">
      <span
        aria-hidden="true"
        className="grid h-6 w-6 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        c
      </span>
      cloneX
    </span>
  );
}

/** Nav item list + logout footer, shared by the desktop sidebar and the mobile drawer. */
function NavLinks({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useReviewBadge();

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/login");
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              data-testid={`sidebar-nav-${item.key}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative mb-0.5 flex max-md:min-h-11 items-center justify-between rounded-token px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface-hover font-medium text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              )}
              <span className="flex items-center gap-2.5">
                <span className={active ? "text-primary" : "text-text-muted group-hover:text-text"}>
                  <Icon name={item.key} />
                </span>
                {item.label}
              </span>
              {item.key === "review" && count > 0 && (
                <span
                  data-testid="review-badge-count"
                  className="rounded-full bg-danger px-1.5 py-0.5 text-xs font-semibold text-white"
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-border px-4 py-3">
        <p className="truncate text-xs text-text-muted">{user.name}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 text-xs text-text-muted underline hover:text-text"
        >
          ログアウト
        </button>
      </div>
    </>
  );
}

/**
 * "Find or create…" trigger styled like Octolane's pinned sidebar search
 * (observed in both real-app captures), with the ⌘K hint chip.
 */
function FindOrCreateButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      data-testid="find-or-create-button"
      onClick={onOpen}
      className="mx-2 mb-2 flex min-h-9 items-center gap-2 rounded-token border border-border bg-bg px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="flex-1 text-left">検索または作成…</span>
      <kbd className="rounded border border-border bg-surface px-1 text-[10px] text-text-muted">⌘K</kbd>
    </button>
  );
}

/** md and up: fixed-width sidebar, unchanged from the pre-responsive layout. */
function Sidebar({ user, workspace, onOpenPalette }: { user: User; workspace: Workspace; onOpenPalette: () => void }) {
  return (
    <nav className="hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="px-4 pb-2 pt-5">
        <Wordmark />
        <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-text-muted">
          {workspace.name}
          <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </p>
      </div>
      <FindOrCreateButton onOpen={onOpenPalette} />
      <NavLinks user={user} />
    </nav>
  );
}

/** Below md: fixed top header (logo + hamburger) and an overlay drawer reusing NavLinks. */
function MobileHeader({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const { count } = useReviewBadge();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Wordmark />
        <button
          type="button"
          data-testid="mobile-menu-button"
          aria-label="メニューを開く"
          onClick={() => setOpen(true)}
          className="relative flex h-11 w-11 items-center justify-center rounded-token text-text hover:bg-surface-hover"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            ☰
          </span>
          {count > 0 && (
            <span
              data-testid="mobile-review-badge"
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white"
            >
              {count}
            </span>
          )}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden" data-testid="mobile-drawer">
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <nav className="relative flex h-full w-72 max-w-[80%] flex-col border-r border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between px-4 py-5">
              <Wordmark />
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>
            <NavLinks user={user} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </>
  );
}

export function AppShell({
  user,
  workspace,
  initialReviewCount,
  children,
}: {
  user: User;
  workspace: Workspace;
  initialReviewCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global shortcuts: ⌘/ (Ctrl+/) jumps to AI Chat (docs: "Open AI Chat with
  // Cmd+/"); ⌘K (Ctrl+K) opens the Find-or-create palette, matching the ⌘K
  // hint on Octolane's own sidebar search field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        router.push("/app/chat");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <ReviewBadgeProvider initialCount={initialReviewCount}>
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar user={user} workspace={workspace} onOpenPalette={() => setPaletteOpen(true)} />
        <MobileHeader user={user} />
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </ReviewBadgeProvider>
  );
}
