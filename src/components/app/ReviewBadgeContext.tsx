"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiGet } from "@/lib/client/api";

type ReviewBadgeContextValue = {
  count: number;
  refresh: () => void;
  decrement: (n?: number) => void;
};

const ReviewBadgeContext = createContext<ReviewBadgeContextValue | null>(null);

export function useReviewBadge(): ReviewBadgeContextValue {
  const ctx = useContext(ReviewBadgeContext);
  if (!ctx) throw new Error("useReviewBadge must be used within ReviewBadgeProvider");
  return ctx;
}

export function ReviewBadgeProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const pathname = usePathname();

  const refresh = useCallback(() => {
    apiGet<{ count: number }>("/api/proposals?status=PENDING&count=true")
      .then((res) => setCount(res.count))
      .catch(() => {
        /* badge count is best-effort; keep previous value on failure */
      });
  }, []);

  useEffect(() => {
    refresh();
    // Re-check whenever the user navigates (covers stale counts after leaving /app/review).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const decrement = useCallback((n = 1) => {
    setCount((prev) => Math.max(0, prev - n));
  }, []);

  return (
    <ReviewBadgeContext.Provider value={{ count, refresh, decrement }}>{children}</ReviewBadgeContext.Provider>
  );
}
