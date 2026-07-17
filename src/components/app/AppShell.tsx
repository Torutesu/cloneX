"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User, Workspace } from "@prisma/client";
import { ReviewBadgeProvider, useReviewBadge } from "@/components/app/ReviewBadgeContext";
import { apiPost } from "@/lib/client/api";

const NAV_ITEMS = [
  { key: "dashboard", href: "/app", label: "Dashboard", icon: "🏠" },
  { key: "chat", href: "/app/chat", label: "Chat", icon: "💬" },
  { key: "pipeline", href: "/app/pipeline", label: "Pipeline", icon: "📊" },
  { key: "contacts", href: "/app/contacts", label: "Contacts", icon: "👤" },
  { key: "companies", href: "/app/companies", label: "Companies", icon: "🏢" },
  { key: "tasks", href: "/app/tasks", label: "Tasks", icon: "✅" },
  { key: "review", href: "/app/review", label: "Review", icon: "🔍" },
  { key: "settings", href: "/app/settings", label: "Settings", icon: "⚙️" },
] as const;

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
              className={`mb-1 flex max-md:min-h-11 items-center justify-between rounded-token px-3 py-2 text-sm transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-text hover:bg-surface-hover"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
              {item.key === "review" && count > 0 && (
                <span
                  data-testid="review-badge-count"
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "bg-white/20 text-primary-foreground" : "bg-danger text-white"
                  }`}
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

/** md and up: fixed-width sidebar, unchanged from the pre-responsive layout. */
function Sidebar({ user }: { user: User }) {
  return (
    <nav className="hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="px-4 py-5 text-lg font-bold text-text">cloneX</div>
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
        <span className="text-lg font-bold text-text">cloneX</span>
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
              <span className="text-lg font-bold text-text">cloneX</span>
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
  void workspace;
  return (
    <ReviewBadgeProvider initialCount={initialReviewCount}>
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar user={user} />
        <MobileHeader user={user} />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </ReviewBadgeProvider>
  );
}
