// ブランド設定(design tokens)。色・フォント・角丸は必ずここを経由すること。
// 実体は brands/<brand>.config.ts — importを差し替えるだけで全画面が着せ替わる
import { butaiBrand, type SableBrandConfig } from "../../brands/butai.config";

export const brand: SableBrandConfig = butaiBrand;

/** ルートlayoutでCSSカスタムプロパティとして注入する */
export function brandCssVars(): Record<string, string> {
  const c = brand.colors;
  return {
    "--brand-primary": c.primary,
    "--brand-primary-dark": c.primaryDark,
    "--brand-bg": c.bg,
    "--brand-surface": c.surface,
    "--brand-text": c.text,
    "--brand-text-muted": c.textMuted,
    "--brand-border": c.border,
    "--brand-success": c.success,
    "--brand-warning": c.warning,
    "--brand-danger": c.danger,
    "--brand-stage-bg": c.stageBg,
    "--brand-font": brand.font,
    "--brand-radius": brand.radius,
  };
}
