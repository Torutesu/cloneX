"use client";

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

function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useReviewBadge();

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/login");
  }

  return (
    <nav className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-4 py-5 text-lg font-bold text-text">cloneX</div>
      <div className="flex-1 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              data-testid={`sidebar-nav-${item.key}`}
              className={`mb-1 flex items-center justify-between rounded-token px-3 py-2 text-sm transition-colors ${
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
    </nav>
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
      <div className="flex min-h-screen bg-bg">
        <Sidebar user={user} />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </ReviewBadgeProvider>
  );
}
