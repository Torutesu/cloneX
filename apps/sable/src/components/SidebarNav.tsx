"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { key: "sessions", label: "セッション", path: "sessions", testId: "nav-sessions" },
  { key: "insights", label: "インサイト", path: "insights", testId: "nav-insights" },
  { key: "sources", label: "Brain: ソース", path: "brain/sources", testId: "nav-sources" },
  { key: "knowledge", label: "Brain: ナレッジ", path: "brain/knowledge", testId: "nav-knowledge" },
  { key: "scenario", label: "デモシナリオ", path: "scenario", testId: "nav-scenario" },
  { key: "persona", label: "ペルソナ", path: "persona", testId: "nav-persona" },
  { key: "deploy", label: "配備", path: "deploy", testId: "nav-deploy" },
];

export function SidebarNav({ aiId }: { aiId: string }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {ITEMS.map((item) => {
        const href = `/app/${aiId}/${item.path}`;
        const active = pathname === href;
        return (
          <Link
            key={item.key}
            href={href}
            data-testid={item.testId}
            className={`sidebar-link ${active ? "active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
