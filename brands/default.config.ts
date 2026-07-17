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

/**
 * Palette calibrated against Octolane's live "forge-octolane" design system
 * (captured 2026-07-17): the accent is `core-blue-9` (#0081F2), semantic status
 * colors come from their `status-*-9` ramp, and the neutrals are the warm
 * off-white / near-black grays the product actually ships (not the cool slate
 * used before this pass). See pipeline/octolane/design-observations.md.
 */
const defaultBrand: BrandConfig = {
  name: "cloneX",
  colors: {
    primary: "#0081f2", // core-blue-9
    primaryHover: "#006fdb", // one step darker for hover/active
    primaryForeground: "#ffffff",
    bg: "#f7f7f5", // warm off-white app canvas
    surface: "#ffffff",
    surfaceHover: "#f2f1ed", // warm gray row/hover
    border: "#e7e6e1", // warm hairline
    text: "#1a1a17", // near-black, warm
    textMuted: "#78756c", // warm muted gray
    success: "#46a758", // status-success-9
    warning: "#f76b15", // status-warning-9
    danger: "#e5484d", // status-error-9
    info: "#5b5bd6", // status-feature-9 (distinct usable accent)
  },
  radius: "0.625rem",
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export default defaultBrand;
