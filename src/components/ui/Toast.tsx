"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
};

type ToastContextValue = {
  show: (message: string, opts?: { kind?: ToastKind; action?: ToastItem["action"]; durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const KIND_STYLES: Record<ToastKind, string> = {
  success: "bg-success text-white",
  error: "bg-danger text-white",
  info: "bg-text text-bg",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback<ToastContextValue["show"]>((message, opts) => {
    const id = idRef.current++;
    const item: ToastItem = { id, kind: opts?.kind ?? "success", message, action: opts?.action };
    setToasts((prev) => [...prev, item]);
    const duration = opts?.durationMs ?? 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-token px-4 py-3 text-sm shadow-lg flex items-center gap-3 ${KIND_STYLES[t.kind]}`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                className="underline underline-offset-2 font-medium"
                onClick={t.action.onClick}
                type="button"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
