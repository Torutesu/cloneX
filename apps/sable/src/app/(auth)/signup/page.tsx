"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { brand } from "@/brand/config";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      router.push("/app");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "登録に失敗しました");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-bold" style={{ color: "var(--brand-primary)" }}>
          {brand.name} — サインアップ
        </h1>
        <div>
          <label className="label" htmlFor="name">お名前</label>
          <input id="name" data-testid="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input id="email" data-testid="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード(8文字以上)</label>
          <input id="password" data-testid="password" className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && (
          <p className="text-sm" style={{ color: "var(--brand-danger)" }} role="alert">{error}</p>
        )}
        <button data-testid="signup-submit" className="btn btn-primary w-full justify-center" disabled={busy}>
          登録する
        </button>
        <p className="text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          登録済み? <Link href="/signin" className="underline">サインイン</Link>
        </p>
      </form>
    </main>
  );
}
