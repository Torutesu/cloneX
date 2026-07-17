"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-token px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary: "bg-surface border border-border text-text hover:bg-surface-hover",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "text-text-muted hover:text-text hover:bg-surface-hover",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-token border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      {...props}
    />
  );
}

export function ErrorBanner({ children, testId = "error-banner" }: { children: React.ReactNode; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-token bg-danger/10 border border-danger/30 text-danger px-4 py-3 text-sm"
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-3xl">{icon}</div>}
      <p className="text-text-muted text-sm">{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-token bg-surface-hover ${className}`} />;
}

export function ConfidenceBadge({ confidence, testId }: { confidence: number; testId: string }) {
  const color = confidence >= 0.9 ? "bg-success/15 text-success" : confidence >= 0.7 ? "bg-warning/15 text-warning" : "bg-surface-hover text-text-muted";
  return (
    <span data-testid={testId} className={`rounded-token px-2 py-0.5 text-xs font-medium ${color}`}>
      confidence {confidence.toFixed(2)}
    </span>
  );
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-token border border-border bg-surface p-4 ${className}`}
      {...props}
    />
  );
}
