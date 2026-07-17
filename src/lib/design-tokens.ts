import brand from "../../brands/default.config";
import type { BrandConfig } from "../../brands/default.config";

/**
 * Converts the active BrandConfig into a CSS custom-property string that gets
 * injected once in the root layout. Components must reference colors via
 * `var(--color-*)` (see tailwind theme mapping in app/globals.css) — never
 * import hex values directly.
 */
export function brandToCssVars(config: BrandConfig = brand): string {
  const c = config.colors;
  return `
    --color-primary: ${c.primary};
    --color-primary-hover: ${c.primaryHover};
    --color-primary-foreground: ${c.primaryForeground};
    --color-bg: ${c.bg};
    --color-surface: ${c.surface};
    --color-surface-hover: ${c.surfaceHover};
    --color-border: ${c.border};
    --color-text: ${c.text};
    --color-text-muted: ${c.textMuted};
    --color-success: ${c.success};
    --color-warning: ${c.warning};
    --color-danger: ${c.danger};
    --color-info: ${c.info};
    --radius: ${config.radius};
    --font-sans: ${config.font};
  `;
}

export const activeBrand = brand;
