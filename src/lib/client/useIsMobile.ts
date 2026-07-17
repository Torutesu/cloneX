"use client";

import { useEffect, useState } from "react";

// Matches Tailwind's `md` breakpoint (768px) so the table/card switch lines up exactly
// with the `md:` utility classes used elsewhere in the same screens.
const QUERY = "(max-width: 767px)";

/**
 * Detects the md breakpoint via matchMedia so components can render a single variant
 * (card list vs. table, etc.) instead of mounting both and hiding one with CSS — which
 * would leave two elements sharing the same data-testid in the DOM at once.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
