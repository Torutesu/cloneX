"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { brand } from "@/brand/config";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/app");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "サインインに失敗しました");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--brand-primary)" }}>
            {brand.name}
          </h1>
          <p className="text-sm" style={{ color: "var(--brand-text-muted)" }}>
            {brand.tagline}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input
            id="email"
            data-testid="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード</label>
          <input
            id="password"
            data-testid="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-sm" style={{ color: "var(--brand-danger)" }} role="alert">
            {error}
          </p>
        )}
        <button data-testid="signin-submit" className="btn btn-primary w-full justify-center" disabled={busy}>
          サインイン
        </button>
        <p className="text-center text-sm" style={{ color: "var(--brand-text-muted)" }}>
          アカウント未作成? <Link href="/signup" className="underline">サインアップ</Link>
        </p>
      </form>
    </main>
  );
}
