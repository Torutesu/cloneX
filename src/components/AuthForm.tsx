"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, ApiClientError } from "@/lib/client/api";
import { Button, ErrorBanner, TextInput } from "@/components/ui/primitives";
import { activeBrand } from "@/lib/design-tokens";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await apiPost("/api/auth/signup", { email, password, name });
        router.push("/onboarding");
      } else {
        await apiPost("/api/auth/login", { email, password });
        router.push("/app");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("エラーが発生しました");
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-token border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-text">{activeBrand.name}</h1>
        <p className="mb-6 text-center text-sm text-text-muted">
          {mode === "login" ? "ログイン" : "アカウント作成"}
        </p>

        {error && (
          <div className="mb-4">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        )}

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <TextInput
            data-testid="email-input"
            type="email"
            placeholder="メールアドレス"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            data-testid="password-input"
            type="password"
            placeholder="パスワード(8文字以上)"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && (
            <TextInput
              data-testid="name-input"
              type="text"
              placeholder="お名前"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Button data-testid="submit-button" type="submit" disabled={loading} className="mt-2 w-full">
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {mode === "login" ? "ログイン" : "アカウント作成"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          {mode === "login" ? (
            <>
              アカウントをお持ちでない方は{" "}
              <Link data-testid="switch-link" href="/signup" className="text-primary hover:underline">
                新規登録
              </Link>
            </>
          ) : (
            <>
              すでにアカウントをお持ちの方は{" "}
              <Link data-testid="switch-link" href="/login" className="text-primary hover:underline">
                ログイン
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
