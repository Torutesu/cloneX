import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { brand } from "@/brand/config";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: "var(--brand-border)", background: "var(--brand-surface)" }}
      >
        <Link href="/app" className="font-bold" style={{ color: "var(--brand-primary)" }}>
          {brand.name}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span style={{ color: "var(--brand-text-muted)" }}>{user.name}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
