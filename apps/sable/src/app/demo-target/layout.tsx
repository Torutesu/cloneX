// バンドルのサンプル製品「TaskFlow」。LiveBoxの代替としてiframe内に表示される
import Link from "next/link";

export default function DemoTargetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#F0F2F8", color: "#1F2437" }}>
      <header
        className="flex items-center gap-6 px-6 py-3"
        style={{ background: "#1F2437", color: "#fff" }}
      >
        <span className="font-bold tracking-wide">⚡ TaskFlow</span>
        <nav className="flex gap-4 text-sm opacity-90">
          <Link href="/demo-target/dashboard">ダッシュボード</Link>
          <Link href="/demo-target/board">ボード</Link>
          <Link href="/demo-target/reports">レポート</Link>
          <Link href="/demo-target/settings">設定</Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
