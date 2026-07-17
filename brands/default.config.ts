/**
 * Brand / design-token config.
 *
 * Swap this file (or point BRAND_CONFIG at another `brands/<brand>.config.ts`
 * file with the same shape) to re-skin the entire app. Every component reads
 * colors via the CSS variables generated from this object in
 * `src/lib/design-tokens.ts` / `app/globals.css` — never hardcode colors in
 * components.
 */
export type BrandConfig = {
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryForeground: string;
    bg: string;
    surface: string;
    surfaceHover: string;
    border: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  radius: string; // e.g. "0.5rem"
  font: string; // CSS font-family stack
};

const defaultBrand: BrandConfig = {
  name: "cloneX",
  colors: {
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    primaryForeground: "#ffffff",
    bg: "#f8fafc",
    surface: "#ffffff",
    surfaceHover: "#f1f5f9",
    border: "#e2e8f0",
    text: "#0f172a",
    textMuted: "#64748b",
    success: "#16a34a",
    warning: "#ca8a04",
    danger: "#dc2626",
    info: "#0ea5e9",
  },
  radius: "0.625rem",
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export default defaultBrand;
