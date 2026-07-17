import Link from "next/link";
import { SidebarNav } from "@/components/SidebarNav";

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ aiId: string }>;
}) {
  const { aiId } = await params;
  return (
    <div className="flex h-full min-h-[calc(100vh-57px)]">
      <aside
        className="w-52 shrink-0 space-y-1 border-r p-3"
        style={{ borderColor: "var(--brand-border)", background: "var(--brand-surface)" }}
      >
        <Link href="/app" className="sidebar-link text-xs" style={{ color: "var(--brand-text-muted)" }}>
          ← AI社員一覧
        </Link>
        <SidebarNav aiId={aiId} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
